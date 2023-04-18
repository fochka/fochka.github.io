import Rete from "rete";
import ReactRenderPlugin from "rete-react-render-plugin";
import ConnectionPlugin from "rete-connection-plugin";
import ContextMenuPlugin from "rete-context-menu-plugin";
import ConnectionPathPlugin from 'rete-connection-path-plugin';
import AreaPlugin from "rete-area-plugin";
import AutoArrangePlugin from 'rete-auto-arrange-plugin';
import { StepNode } from "./Nodes";
import { TextControl, InvisibleControl, HrefControl, ButtonControl, stepSocket } from "./Controls";
import { Spreadsheet } from "./spreadsheet.js";


const ss = new Spreadsheet();
global.ss = ss;


export class StepComponent extends Rete.Component {
  constructor(name, ssData) {
    super(name);
    this.ssData = ssData;
  }

  builder(node) {
    node.addControl(new HrefControl(this.editor, "href", this.ssData.href)); 
    node.addControl(new TextControl(this.editor, "question", this.ssData.question.value || '')); 
    node.addControl(new InvisibleControl(this.editor, "question_formula", this.ssData.question.formula));
    node.addControl(new ButtonControl(this.editor, "addAnswer", this.name)); 
    node.data = { "question": this.ssData.question };
    let inp = new Rete.Input("step", "", stepSocket, true);
    stepSocket.combineWith(inp);
    for(let i = 0; i < this.ssData.answers.length; i++){
      if((this.ssData.answers[i]) && (this.ssData.answers[i].includes('value'))) {
        let obj = JSON.parse(this.ssData.answers[i]);
        if ((!obj.value) && (!obj.formula)) continue;
        let out = new Rete.Output(this.ssData.answers[i], this.ssData.answers[i], stepSocket, false);
        node.addOutput(out);
      }
    }
    

    return node.addInput(inp)
  }

  worker(node, inputs, outputs) {
    //console.log(node.data.greeting);
  }
}

export default async function(container, cafe) {
  global.editorIsLoaded = false;
  if(!cafe) return;
  if((global.editor) && (global.editor.components.size > 0)) return;
  /*const cafes = await cafePromise;
  let cafe;
  if(cafeId)
    cafe = cafes.find(val=>  val.cafeId === cafeId);
  if(!cafe){
    let options = [];
    for(let i = 0; i < cafes.length; i++){
      options.push(<option key={cafes[i].cafeId} value={cafes[i].cafeId}>{cafes[i].cafeName}</option>)
    }
    return (<form action="" method="GET">
      <input type="select" label="Multiple Select" multiple>
      <option disabled>Выберите кафе</option>
        {options}
      </input>
      <p><input type="submit" value="Выбрать"></input></p>
    </form>);
  }*/
  await ss.loadSSGraph(cafe.cafeId, cafe.ssBackId);

  var editor = new Rete.NodeEditor("demo@0.1.0", container);
  global.editor = editor;
  editor.use(ConnectionPlugin);
  editor.use(ReactRenderPlugin, {
    component: StepNode
  });
  editor.use(ContextMenuPlugin);
  editor.use(ConnectionPathPlugin, {
    transformer: () => ([x1, y1, x2, y2]) => [
      [x1, y1], 
      [x1+70, y1], 
      (y2-y1 < 50)? [(x1 + x2)/2, y2-50]:[x2, y2-50], 
      (y2-y1 < 50)? [x2, y2-50]: [x2, y2], 
      [x2, y2],
    ],
    curve: ConnectionPathPlugin.curveBumpY, // curve identifier (ConnectionPathPlugin.curveStepBefore)
    //options: { vertical: true, curvature: 0.1 }, // optional ( vertical: false, curvature: 0.2)
    arrow: { color: '#b1b1d4', marker: 'M2,-7 L2,7 L18,0 z' },
  });
  editor.use(AutoArrangePlugin, { margin: {x: 10, y: 10 }, depth: 0 });

  //editor.trigger('arrange', { node });
  var engine = new Rete.Engine("demo@0.1.0");
  
  for (let step in ss.graph) {
    let component = new StepComponent(step, {        
      question: ss.graph[step].question,
      answers: ss.graph[step].answers,
      href: ss.getSheetUrlByTittle('Шаг ' + step),
    });
    editor.register(component);
  }
  
  editor.on(
    "process nodecreated noderemoved connectioncreated connectionremoved",
    async () => {
      console.log("process");
      await engine.abort();
      await engine.process(editor.toJSON());
    }
  );
  editor.on('noderemoved', node => {
    ss.remeberToDeleteStep(node.name);
  });

  await editor.fromJSON(await ss.toRete());

  editor.view.resize();
  AreaPlugin.zoomAt(editor);
  global.editorIsLoaded = true;
  //editor.trigger("process");
}
