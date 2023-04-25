//import { useState } from "react";
const POS_COLUMN_IDX = 23;
const ONE_STEP_ROW_COUNT = 30; // Не менять
const { GoogleSpreadsheet } = require('google-spreadsheet');
const apiSheetKey = require('./client_secret_google_sheets.json');
        //const [error, setError] = useState(Error());

export class Spreadsheet {
    constructor(){
        this.graph = null;
        this.sheetName =  'Граф';
        this.sheetsToDelete = [];
        this.items = [];
    }
    loadSSGraph = async (cafeId, ssId) => {        
        try{
            if(ssId === this.ssId)
                return;
            this.cafeId = cafeId;
            this.ssId = ssId;
            this.doc = new GoogleSpreadsheet(this.ssId);
            await this.doc.useServiceAccountAuth(apiSheetKey);
            await this.doc.loadInfo();
            let steps = {};
            const allSheets = this.doc.sheetsByIndex;
            for (let i = 0; i < allSheets.length; i++) {
                if (!(allSheets[i].title.startsWith('Шаг'))) continue;
                // Add formuls to question and answers        
                let stepName = allSheets[i].title.substring(3).trim();
                if((stepName) && (!Object.keys(steps).includes(stepName))){
                    let sheet = this.doc.sheetsByTitle['Шаг ' + stepName];
                    if (sheet) {
                        await sheet.loadCells({ endColumnIndex: 3 });
                        let cell = sheet.getCell(0, 0);
                        let question = { value: cell.value, formula: cell.formula };
                        
                        if (sheet.rowCount < ONE_STEP_ROW_COUNT) {
                            await sheet.resize({ rowCount: ONE_STEP_ROW_COUNT, columnCount: sheet.columnCount });
                            await sheet.loadCells({ endColumnIndex: 3 });
                        }

                        let answers = [];
                        let nextSteps = [];
                        for (let j = 1; j < ONE_STEP_ROW_COUNT; j++) {
                            let cell = sheet.getCell(j, 0);
                            if ((cell.value) || (cell.formula)) {
                                let answer = JSON.stringify({ value: cell.value, formula: cell.formula })
                                if (answers.includes(answer)) continue;
                                answers.push(answer);
                                cell = sheet.getCell(j, 1);
                                nextSteps.push(JSON.stringify({ value: cell.value, formula: cell.formula }));
                            }
                        }
                        await sheet.loadCells('X1');
                        cell = sheet.getCell(0, POS_COLUMN_IDX);
                        steps[stepName] = {
                            question: question,
                            answers: answers,
                            nextSteps: nextSteps,
                            position: JSON.parse(cell.value) || null,
                        };
                    }
                    /*else {
                        let question = { value: res[i].question };
                        let answers = res.filter( x => x.step === stepName );
                        answers.forEach(x => { x.answer = JSON.stringify({ value: x.answer }) });
                        let nextSteps = res.filter( x => x.step === stepName );
                        //nextSteps.forEach(x => { x.nextStep = JSON.stringify({ value: x.nextStep }) });
                        steps[stepName] = {
                            question: question,
                            answers: answers,
                            nextSteps: nextSteps,
                            position: null,
                        };
                    }*/
                }
            }
            this.graph = steps;
            await this.loadItems();
            console.log('Graph are loaded');
            return true;
        }
        catch(e){
            //setError(e);
            console.error(`Cannot load graph from goodle with ssId = ${this.ssId}`, Error(e.message || e));
            throw e; 
        }
    }

    getSheetUrlById = (sheetId) => {
        return this.doc._spreadsheetUrl + '#gid=' + sheetId;
    }

    getSheetUrlByTittle = (tittle) => {
        const sheet = this.doc.sheetsByTitle[tittle];
        const url = (sheet)? this.getSheetUrlById(sheet.sheetId) : null;
        return url;
    }

    loadItems = async () => {
        try {
            const sheet = this.doc.sheetsByTitle['Общий справочник'];
            if (!sheet) throw new Error('Лист "Общий справочник" не найден');
            let rows = await sheet.getRows();
            let rowsWithoutEmptyNames = rows.filter(x => (x._rawData.length >= 3 && x._rawData[3] !== ""));
            for (let i = 0; i < rowsWithoutEmptyNames.length; i++) {
                let name = "";
                if (rowsWithoutEmptyNames[i]._rawData[0] !== undefined) name = rowsWithoutEmptyNames[i]._rawData[0].trim();
                this.items.push({name : name});
            }
        }
        catch (e) {
            console.error(e);
        }

    }

    remeberToDeleteStep = (stepName) => {                
        this.sheetsToDelete.push(stepName);
    }

    toRete = async() => {
        let reteGraph = {
            id: `demo@0.1.0`,//`cafe${this.cafeId}`,
            nodes: {}
        }
        let pos = -800;
        let idx = 0;
        for (let step in this.graph) {
            try{
                let answers = this.graph[step].answers;
                let outputs = {};
                for(let i = 0; i < answers.length; i++){
                    if(answers[i])
                        outputs[answers[i]] = { connections: [] }
                }
                reteGraph.nodes[idx] = {
                    id: idx,
                    data: {},
                    inputs: { "step": { connections: [] } },
                    name: step,
                    outputs: outputs,
                    position: this.graph[step].position || [pos+=300, -100],
                }
                idx++;
            }
            catch(e){}
        }

        //Connections
        for (let step in this.graph) {
            for (let i = 0; i < this.graph[step].nextSteps.length; i++) {
                try{
                    //if(this.graph[i].answer == 'Назад') continue;
                    let nodeIdx = this.findNodeIdxByStep(reteGraph, step);
                    let nextNodeIdx = this.findNodeIdxByStep(reteGraph, JSON.parse(this.graph[step].nextSteps[i]).value);
                    if((nextNodeIdx === false)||(nodeIdx === false)||(nextNodeIdx === undefined)||(nodeIdx === undefined)) continue;
                    reteGraph.nodes[nodeIdx].outputs[this.graph[step].answers[i]] = {  
                        connections: [ 
                            {
                                node: nextNodeIdx,
                                input: 'step',
                                data: {}
                            } 
                        ] 
                    }
                    reteGraph.nodes[nextNodeIdx].inputs['step'].connections.push({
                        node: nodeIdx,
                        output: this.graph[step].answers[i],
                        data: {},
                    } )
                }
                catch{
                    try{
                        console.error(`load connection failed between steps "${step}" and "${JSON.parse(this.graph[step].nextSteps[i]).value}"`)
                    }catch{}
                }
            }
        }

        return reteGraph;
    }

    findNodeIdxByStep = (reteGraph, step) => {
        for(let node in reteGraph.nodes){
            if(reteGraph.nodes[node].name === step)
                return node;
        }
        return false;
    }

    deleteSheets = async(sheetsToDelete, stepsCount) => {
        if(!sheetsToDelete || !this.sheetName || (sheetsToDelete.length < 1)) return;
        const graphSheet = await this.doc.sheetsByTitle[this.sheetName];
        const rowCount = (sheetsToDelete.length + stepsCount) * ONE_STEP_ROW_COUNT + 1;
        await graphSheet.loadCells('A1:A' + rowCount);
        for(let i = 0; i < sheetsToDelete.length; i++){        
            const sheet = this.doc.sheetsByTitle['Шаг ' + sheetsToDelete[i]];
            if(sheet) await sheet.delete();
            //sheet.clearRows
            let startIdx = -1;
            //let endIdx = -1;
            for(let j = 1; j < rowCount; j++){
                let cell = graphSheet.getCell(j, 0);
                if(cell.value === sheetsToDelete[i]) {
                    if(startIdx<0) startIdx = j;
                    //endIdx = j;
                }
            }
            await graphSheet.clearRows({start: startIdx+1, end: startIdx+ONE_STEP_ROW_COUNT});  
        }
        this.sheetsToDelete = [];        
    }

    saveRete = async(reteGraph) => {
        await this.deleteSheets(this.sheetsToDelete, Object.keys(reteGraph.nodes).length);
        for(let node in reteGraph.nodes){            
            let question = (reteGraph.nodes[node].data.question.formula) ? reteGraph.nodes[node].data.question.formula : reteGraph.nodes[node].data.question.value;
            let ssStep = [
                //[reteGraph.nodes[node].name],
                [
                    {value: question },
                    {value: JSON.stringify(reteGraph.nodes[node].position), columnIdx: POS_COLUMN_IDX},
                ],
            ]
            for(let output in reteGraph.nodes[node].outputs){
                try{
                    let dest;
                    if(reteGraph.nodes[node].outputs[output].connections.length < 1)
                        dest = { name: "", data: { question: "" }};
                    else
                        dest = reteGraph.nodes[reteGraph.nodes[node].outputs[output].connections[0].node];
                    let answer = JSON.parse(output);
                    answer = (answer.formula) ? answer.formula : answer.value;
                    let question = (dest.data.question.formula) ? dest.data.question.formula : dest.data.question.value;
                    ssStep.push([
                        {value: answer},
                        {value: dest.name},
                        {value: question},
                    ]);
                    /*ssGraph.push({
                        step: reteGraph.nodes[node].name,
                        question: reteGraph.nodes[node].data.question,
                        answer: output,
                        nextStep: dest.name,
                        nextQuestion: dest.data.question,
                    })*/
                }
                catch{}
            }
            await this.printArrayToSheet(ssStep, "Шаг " + reteGraph.nodes[node].name);
        }
        //await this.printArrayToSheet(ssGraph, "Граф (собранный)");
    }

    generateGraphSheet = async(sheetName, reteGraph) => {
        try {
            const oldSheetName = this.sheetName;
            this.sheetName = sheetName;
        
            let sheet;
            if(this.doc.sheetsByTitle[sheetName]) {
                sheet = this.doc.sheetsByTitle[sheetName];
                sheet.clear();
            } else {
                sheet = await this.doc.addSheet({
                    "title": sheetName,
                    "gridProperties": {
                        "rowCount": 6000,
                        "columnCount": 30
                    }
                });
            }
            await sheet.loadCells('A1:E1');
            let cell = await sheet.getCell(0, 0);
            Object.assign(cell, { value: 'step' } ); 
            cell = await sheet.getCell(0, 1);
            Object.assign(cell, { value: 'question' } );
            cell = await sheet.getCell(0, 2);
            Object.assign(cell, { value: 'answer' } );
            cell = await sheet.getCell(0, 3);
            Object.assign(cell, { value: 'nextStep' } );
            cell = await sheet.getCell(0, 4);
            Object.assign(cell, { value: 'nextQuestion' } );
            await sheet.saveUpdatedCells();

            let rowIdx = 0;
            for(let node in reteGraph.nodes){
                let ssStep = reteGraph.nodes[node].name;
                await this.addStepToGraphSheet(ssStep, rowIdx);
                rowIdx += ONE_STEP_ROW_COUNT;
            }
            this.sheetName = oldSheetName;
        }
        catch (e) {
            console.error('generateGraphSheet failed!', e);
            throw e;

        }
    }

    printArrayToSheet = async(array, sheetName) => {
        try {
            let sheet;    
            if(this.doc.sheetsByTitle[sheetName]) {
                sheet = this.doc.sheetsByTitle[sheetName];
            } else {
                sheet = await this.doc.addSheet({
                    "title": sheetName,
                    "gridProperties": {
                        "rowCount": ONE_STEP_ROW_COUNT,
                        "columnCount": 30
                    }
                });
            }
            await sheet.clear('A1:C'+ONE_STEP_ROW_COUNT);
            await sheet.loadCells(['A1:Z1', 'A1:C'+array.length]);

            if (array.length === 0) {
                let initCell= await sheet.getCell(0,0);
                initCell.value = "Нет данных";
            }
    
            for (let i=0; i<array.length; i++) {
                if(array[i] === undefined || array[i] === null) continue;
                for(let j=0; j<=array[i].length; j++)  {
                    if(!array[i][j] || !(array[i][j].value)) continue;
                    let cell = await sheet.getCell(i, array[i][j].columnIdx || j);
                    Object.assign(cell, array[i][j]);    
                }
            }
            await sheet.saveUpdatedCells();    
        } catch (e) { 
            console.error(`printing to spreadsheet (id: ${this.ssId}) is failed`, e.message);
            throw e; 
        }
    }

    addNewStepSheet = async(stepName) => {   
        try{           
            let sheet;
            let needAddStepToGraphSheet = false;
            if(this.doc.sheetsByTitle['Шаг ' + stepName]) {
                sheet = this.doc.sheetsByTitle['Шаг ' + stepName];
                sheet.clear();
            }
            else {
                needAddStepToGraphSheet = true;
                 sheet = await this.doc.addSheet({
                    "title": 'Шаг ' + stepName,
                    "gridProperties": {
                        "rowCount": ONE_STEP_ROW_COUNT,
                        "columnCount": 30
                    }
                });
            }
            const array = [
                [{value: "question"}],
                [{value: "answer1"}, {value: "nextStep1"}, {value: "nextQuestion1"}],

            ]
            await this.printArrayToSheet(array, 'Шаг ' + stepName);
            if (needAddStepToGraphSheet) await this.addStepToGraphSheet(stepName);
            return sheet.sheetId;
        }
        catch(e){
            console.error('addNewSheet failed!', e.message);
            throw e;
        }
    }

    addStepToGraphSheet = async(stepName, rowCount) => {
        const sheet = await this.doc.sheetsByTitle[this.sheetName];
        if(rowCount === undefined) {
            rowCount = (await sheet.getRows()).length || 0;
            rowCount = Math.ceil(rowCount / ONE_STEP_ROW_COUNT) * ONE_STEP_ROW_COUNT;
        }
    
        await sheet.loadCells(`A${rowCount + 2}:E${rowCount + ONE_STEP_ROW_COUNT +2}`);
        let cell = await sheet.getCell(rowCount+1, 2);
        Object.assign(cell, {value: `=ЕСЛИОШИБКА(FILTER('Шаг ${stepName}'!A2:A${ONE_STEP_ROW_COUNT}; 'Шаг ${stepName}'!A2:A${ONE_STEP_ROW_COUNT} <> "adfgafdgdfg"))`});   
        cell = await sheet.getCell(rowCount+1, 3);
        Object.assign(cell, {value: `=ЕСЛИОШИБКА(FILTER('Шаг ${stepName}'!B2:B${ONE_STEP_ROW_COUNT}; 'Шаг ${stepName}'!B2:B${ONE_STEP_ROW_COUNT} <> "adfgafdgdfg"))`});   
        cell = await sheet.getCell(rowCount+1, 4);
        Object.assign(cell, {value: `=ЕСЛИОШИБКА(FILTER('Шаг ${stepName}'!C2:C${ONE_STEP_ROW_COUNT}; 'Шаг ${stepName}'!C2:C${ONE_STEP_ROW_COUNT} <> "adfgafdgdfg"))`});   
        for(let i = rowCount + 2; i < rowCount + ONE_STEP_ROW_COUNT + 2; i++){
            let cell = await sheet.getCell(i-1, 0);
            Object.assign(cell, {value: `=ЕСЛИ(ЕПУСТО(C${i});"";"${stepName}")`});    
            cell = await sheet.getCell(i-1, 1);
            Object.assign(cell, {value: `=ЕСЛИ(ЕПУСТО(C${i});"";ЕСЛИОШИБКА(FILTER('Шаг ${stepName}'!A$1; 'Шаг ${stepName}'!A$1 <> "adfgafdgdfg")))`}); 
        }
        await sheet.saveUpdatedCells();
    }
}