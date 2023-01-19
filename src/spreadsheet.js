//import { useState } from "react";
const timeOut = 60*1000;
const { GoogleSpreadsheet } = require('google-spreadsheet');
const apiSheetKey = require('./client_secret_google_sheets.json');
        //const [error, setError] = useState(Error());
var graphLoaded = false;

export class Spreadsheet{
    constructor(){
        this.graph = null;
    }
    loadSSGraph = async (cafeId, ssId, sheetName) => {        
        try{
            if((ssId === this.ssId) && (sheetName === this.sheetName))
                return;
            graphLoaded = false;
            this.cafeId = cafeId;
            this.ssId = ssId;
            this.sheetName = sheetName;
            setTimeout(() => {if(!graphLoaded) throw Error('timeOut')}, timeOut)
            const doc = new GoogleSpreadsheet(this.ssId);
            await doc.useServiceAccountAuth(apiSheetKey);
            await doc.loadInfo();
            const sheet = await doc.sheetsByTitle[this.sheetName];
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

    saveRete = async(reteGraph) => {
        let ssGraph = []
        for(let node in reteGraph.nodes){
            for(let output in reteGraph.nodes[node].outputs){
                try{
                    let dest;
                    if(reteGraph.nodes[node].outputs[output].connections.length < 1)
                        dest = { name: "", data: { question: "" }};
                    else
                        dest = reteGraph.nodes[reteGraph.nodes[node].outputs[output].connections[0].node];
                    ssGraph.push({
                        step: reteGraph.nodes[node].name,
                        question: reteGraph.nodes[node].data.question,
                        answer: output,
                        nextStep: dest.name,
                        nextQuestion: dest.data.question,
                    })
                }
                catch{}
            }
        }
        await this.printArrayToSheet(ssGraph);
    }

    printArrayToSheet = async(array) => {
        try {
            let sheet;
            const doc = new GoogleSpreadsheet(this.ssId);
            await doc.useServiceAccountAuth(apiSheetKey);
            await doc.loadInfo();
    
            if(doc.sheetsByTitle[this.sheetName]) {
                sheet = doc.sheetsByTitle[process.env.SHEET_NAME_TO_SAVE || this.sheetName];
                sheet.clear();
            } else {
                sheet = await doc.addSheet({
                    "title": this.sheetName,
                    "gridProperties": {
                        "rowCount": 6000,
                        "columnCount": 30
                    }
                });
            }
    
            await sheet.loadCells('A1:Z1');
    
            if(array.length === 0) {
                let initCell= await sheet.getCell(0,0);
                initCell.value = "Нет данных";
            }
    
            let i = 0;
            for (let key in array[0]) {
                let initCell= await sheet.getCell(0,i++);
                initCell.value = key;
            }
            await sheet.saveUpdatedCells();
    
            await sheet.loadCells();
            for(let i=0; i<array.length; i++){
                let j = 0;
                for (let key in array[i]) {
                    let cell = await sheet.getCell(i+1, j);
                    if(array[i][key] instanceof Date)
                        cell.value = array[i][key].toString();
                    else
                        if(key[0] !== '_')
                            cell.value = array[i][key];
                    j++;
                }
            }
            sheet.saveUpdatedCells();
        } catch (e) { 
            console.error(`printing to spreadsheet (id: ${this.ssId}) is failed`, e.message);
            //throw e; 
        }
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