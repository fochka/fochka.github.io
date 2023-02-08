//import { useState } from "react";
const timeOut = 60*1000;
const { GoogleSpreadsheet } = require('google-spreadsheet');
const apiSheetKey = require('./client_secret_google_sheets.json');
        //const [error, setError] = useState(Error());
var graphLoaded = false;

export class Spreadsheet{
    constructor(){
        this.graph = null;
        this.sheetName =  'Граф';
        this.sheetsToDelete = [];
    }
    loadSSGraph = async (cafeId, ssId) => {        
        try{
            if(ssId === this.ssId)
                return;
            graphLoaded = false;
            this.cafeId = cafeId;
            this.ssId = ssId;
            //setTimeout(() => {if(!graphLoaded) throw Error('timeOut')}, timeOut)
            this.doc = new GoogleSpreadsheet(this.ssId);
            await this.doc.useServiceAccountAuth(apiSheetKey);
            await this.doc.loadInfo();
            const sheet = await this.doc.sheetsByTitle[this.sheetName];
            let res = await sheet.getRows();
            res.forEach(x => {
                if (x._rawData[2] !== undefined) x._rawData[2] = x._rawData[2].trim();
            });
            if((res) && (res.length > 0)){
                this.graph = res;
                graphLoaded = true;
                console.log('Graph are loaded');
                return true;
            }
        }
        catch(e){
            //setError(e);
            console.error(`Cannot load graph from goodle with ssId = ${this.ssId}`, Error(e.message || e));
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

    remeberToDeleteStep = (stepName) => {                
        this.sheetsToDelete.push(stepName);
    }

    toRete = async() => {
        let reteGraph = {
            id: `demo@0.1.0`,//`cafe${this.cafeId}`,
            nodes: {}
        }
        let steps = []
        let pos = -800;
        let idx = 0;
        for(let i = 0; i < this.graph.length; i++){
            try{
                let step = this.graph[i].step;
                if((step) && (!steps.includes(step))){
                    steps.push(step);
                    let answers= await this.getAnswers(step);
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
                        position: [pos+=300, -100],
                    }
                    idx++;
                }
            }
            catch(e){}
        }

        //Connections
        for(let i = 0; i < this.graph.length; i++){
            try{
                let nodeIdx = this.findNodeIdxByStep(reteGraph, this.graph[i].step);
                let nextNodeIdx = this.findNodeIdxByStep(reteGraph, this.graph[i].nextStep);
                if((!nextNodeIdx)||(!nodeIdx)) continue;
                reteGraph.nodes[nodeIdx].outputs[this.graph[i].answer] = {  
                    connections: [ 
                        {node: nextNodeIdx, input: 'step', data: {}} 
                    ] 
                }
                reteGraph.nodes[nextNodeIdx].inputs['step'].connections.push({node: nodeIdx, output: this.graph[i].answer, data: {}} )
            }
            catch{}
        }

        return reteGraph;
    }

    findNodeIdxByStep = (reteGraph, step) => {
        for(let node in reteGraph.nodes){
            if(reteGraph.nodes[node].name === step)
                return node;
        }
    }

    delteSheets = async(sheetsToDelete, stepsCount) => {
        if(!sheetsToDelete || !this.sheetName || (sheetsToDelete.length < 1)) return;
        const graphSheet = await this.doc.sheetsByTitle[this.sheetName];
        const rowCount = (sheetsToDelete.length + stepsCount) * 30 + 1;
        await graphSheet.loadCells('A1:A' + rowCount);
        for(let i = 0; i < sheetsToDelete.length; i++){ 
            //sheet.clearRows
            let startIdx = -1;
            let endIdx = -1;
            for(let j = 1; j < rowCount; j++){
                let cell = graphSheet.getCell(j, 0);
                if(cell.value == sheetsToDelete[i]) {
                    if(startIdx<0) startIdx = j;
                    endIdx = j;
                }
            }
            await graphSheet.clearRows(startIdx+1, endIdx+1);         
            const sheet = this.doc.sheetsByTitle['Шаг ' + sheetsToDelete[i]];
            if(sheet) await sheet.delete();
        }
        this.sheetsToDelete.clear();        
    }

    saveRete = async(reteGraph) => {
        let ssGraph = [];
        await this.delteSheets(this.sheetsToDelete, Object.keys(reteGraph.nodes).length);
        for(let node in reteGraph.nodes){
            let ssStep = [
                //[reteGraph.nodes[node].name],
                [{value: reteGraph.nodes[node].data.question}],
            ]
            for(let output in reteGraph.nodes[node].outputs){
                try{
                    let dest;
                    if(reteGraph.nodes[node].outputs[output].connections.length < 1)
                        dest = { name: "", data: { question: "" }};
                    else
                        dest = reteGraph.nodes[reteGraph.nodes[node].outputs[output].connections[0].node];
                    ssStep.push([
                        {value: output},
                        {value: dest.name},
                        {value: dest.data.question},
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

    printArrayToSheet = async(array, sheetName) => {
        try {
            let sheet;
            /*const doc = new GoogleSpreadsheet(this.ssId);
            await doc.useServiceAccountAuth(apiSheetKey);
            await doc.loadInfo();*/
    
            if(this.doc.sheetsByTitle[sheetName]) {
                sheet = this.doc.sheetsByTitle[sheetName];
                sheet.clear();
            } else {
                sheet = await this.doc.addSheet({
                    "title": sheetName,
                    "gridProperties": {
                        "rowCount": 30,
                        "columnCount": 30
                    }
                });
            }
    
            await sheet.loadCells('A1:Z1');

            if(array.length === 0) {
                let initCell= await sheet.getCell(0,0);
                initCell.value = "Нет данных";
            }
    
            await sheet.loadCells('A1:Z'+array.length);
            for(let i=0; i<array.length; i++){
                if(array[i] === undefined || array[i] === null) continue;
                for(let j=0; j<=array[i].length; j++)
                {
                    if(!array[i][j] || !(array[i][j].value)) continue;
                    let cell = await sheet.getCell(i, j);
                    Object.assign(cell, array[i][j]);    
                }
            }
            await sheet.saveUpdatedCells();
        } catch (e) { 
            console.error(`printing to spreadsheet (id: ${this.ssId}) is failed`, e.message);
            //throw e; 
        }
    }

    addNewStepSheet = async(stepName) => {   
        try{     
            const sheet = await this.doc.addSheet({
                "title": 'Шаг ' + stepName,
                "gridProperties": {
                    "rowCount": 30,
                    "columnCount": 30
                }
            });
            const array = [
                [{value: "question"}],
                [{value: "answer1"}, {value: "nextStep1"}, {value: "nextQuestion1"}],

            ]
            await this.printArrayToSheet(array, 'Шаг ' + stepName);
            await this.addStepToGraphSheet(stepName);
            return sheet.sheetId;
        }
        catch(e){
            console.error('addNewSheet failed!', e.message);
        }
    }

    addStepToGraphSheet = async(stepName) => {
        const sheet = await this.doc.sheetsByTitle[this.sheetName];
        let rowCount = (await sheet.getRows()).length || 0;
        rowCount = Math.ceil(rowCount / 30) * 30;
    
        await sheet.loadCells(`A${rowCount + 2}:E${rowCount + 32}`);
        let j = 2;
        for(let i = rowCount + 2; i < rowCount + 32; i++){
            let cell = await sheet.getCell(i-1, 0);
            Object.assign(cell, {value: `=ЕСЛИ(ЕПУСТО(C${i});"";"${stepName}")`});    
            cell = await sheet.getCell(i-1, 1);
            Object.assign(cell, {value: `=ЕСЛИ(ЕПУСТО(D${i});"";'Шаг ${stepName}'!A$1)`});    
            cell = await sheet.getCell(i-1, 2);
            Object.assign(cell, {value: `='Шаг ${stepName}'!A${j}`});   
            cell = await sheet.getCell(i-1, 3);
            Object.assign(cell, {value: `='Шаг ${stepName}'!B${j}`});   
            cell = await sheet.getCell(i-1, 4);
            Object.assign(cell, {value: `='Шаг ${stepName}'!C${j}`});  
            j++; 
        }
        await sheet.saveUpdatedCells();
    }
    

    getQuestion = async(step) => { //change to UserId
        try{
            if(!this.graph) throw Error('Graph is not loaded')
            let row = this.graph.find(x => x.step === step);
            return row.question;
        } catch (e){
            console.error(`Cannot get question for step ${step}`, e.message || e);
        }
    }
    getAnswers = async(step) => {
        try{
            if(!this.graph) throw Error('Graph is not loaded')
            let answers = this.graph.filter(x => x.step === step/* && x.answer !== "anyText"*/)
            let filteredButtonRows = [];
            answers.forEach(x => filteredButtonRows.push(x.answer))
            return filteredButtonRows;
        } catch (e){
            console.error(`Cannot get buttons for step ${step}`, e.message || e);
            return [];
        }
    }

    getTimes = async () => {
        try{
            if(!this.graph) throw Error('Graph is not loaded')
            let filteredButtonRows = this.graph.filter(x => x.step === global.stepOfTime && x.answer !== "anyText");
            let times = [];
            filteredButtonRows.forEach(x => times.push(x.answer));
            //times = times.filter(x => isTimeButton(x));
            return times;
        } catch (e){
            console.error(`Cannot get times`, e.message || e);
            return [];
        }
    }
}