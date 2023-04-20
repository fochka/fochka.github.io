import React from "react";
import ReactDOM from "react-dom";
import init, {StepComponent} from "./editor";
import getAllCafeInfo from "./DBLib.js";
import "./styles.css";
import { Spreadsheet } from "./spreadsheet.js";
import Cookies from 'universal-cookie';

const cookies = new Cookies();

global.editorIsLoaded = false;
global.emptyAnswerStr = ' — ';
const {useState, useEffect} = React;
const clickArrange = () => {
  if(!(global.editor)) return alert('Редактор занят');
  global.editor.trigger('arrange', 10);
}

const clickCreateStep = async () => {
  if(!(global.editorIsLoaded)) return alert('Редактор занят');
  const stepName = prompt('Название шага');
  if(!stepName) return; 
  try {
    if (global.editor.getComponent(stepName)) return alert('Шаг с таким именем уже зарегистрирован');
  } catch{}
  try {
    const sheetId = await global.ss.addNewStepSheet(stepName);
    if(!sheetId) throw new Error('No sheetId');
    const step = new StepComponent(stepName, {        
      question: {value: 'question'},
      answers: [ JSON.stringify({value: 'answer'}) ],
      href: global.ss.getSheetUrlById(sheetId),
    }); 
    global.editor.register(step);
    global.editor.addNode(await step.createNode());
  }
  catch{
    return alert('Не удалось создать лист "Шаг ' + stepName + '" в гугл таблице. Возможно такой шаг уже создан');
  }
}

const clickImport = async () => {
  if(!(global.editorIsLoaded)) return alert('Редактор занят');
  const ss = new Spreadsheet();
  await ss.loadSSGraph(-1, prompt('ID гугл-таблицы:'));
  let graph1 = await ss.toRete();
  let graph2 = await global.editor.toJSON();
  const firstId = Object.keys(graph2.nodes).length;
  for(let i = 0; i < Object.keys(graph1.nodes).length; i++){
    graph1.nodes[i].id = firstId + i;
    graph1.nodes[firstId + i] = graph1.nodes[i];

    await global.ss.addStepToGraphSheet(graph1.nodes[i].name);
    
    let step = new StepComponent(graph1.nodes[i].name, {        
      question: '',
      answers: [],
      href: '',
    }); 
    global.editor.register(step);
    delete graph1.nodes[i];
  } 
  graph2.nodes = Object.assign({}, graph2.nodes, graph1.nodes);
  global.editor.fromJSON(graph2);
  
  for(let node in graph1.nodes){
    let ssStep = graph1.nodes[node].name;
    await global.ss.addStepToGraphSheet(ssStep);
  }
  /*
    >>>>> TO-DO: Протестить эту функцию
    + загружать инфу о наличии формулы в кнопках
  */

}

function getCafeById(cafeId, cafes){
  if(!cafeId) return false;
  const cafe = cafes.find(val => val.cafeId === cafeId);
  return (cafe)? cafe : false;
}



function App() {
  useEffect(() => {
    const handleWindowBeforeUnload = event => {
      if (!(global.editorIsLoaded)) {
        event.preventDefault();
        alert('Ну видишь же, загружается'); // <<<<<< Не работает!
      }
    };
    window.addEventListener('beforeunload', handleWindowBeforeUnload);
  }, []);
  
  function clickChangeCafe() {
    if(!(global.editorIsLoaded)) return alert('Редактор занят');
    window.location.search = '';
    setCafes();
  }

  function clickSave() {
    if(!(global.editorIsLoaded)) return alert('Редактор занят');
    try{
      global.editorIsLoaded = false;
      setDisplaySaving('block');
      global.ss.saveRete(global.editor.toJSON()).then(
        result => { setDisplaySaving('none'); global.editorIsLoaded = true; return alert('Сценарий сохранен'); },
        error => { setDisplaySaving('none'); global.editorIsLoaded = true; return alert('Сценарий не сохранен'); }
      );
    }
    catch(e){
      setDisplaySaving('none'); 
      global.editorIsLoaded = true;
      return alert('Сценарий не сохранен, ошибка ' + e.message)
    }
  };

  function generateGraphSheet() {
    if(!(global.editorIsLoaded)) return alert('Редактор занят');
    if(!window.confirm('Граф буден сохранен в лист "Граф (сгенерированный)". Если такой лист уже существует, он будет перезаписан. Продолжить?')) return;
    global.editorIsLoaded = false;
    try{
      global.ss.generateGraphSheet('Граф (сгенерированный)', global.editor.toJSON()).then(
        result => { global.editorIsLoaded = true; return alert('Лист графа успешно создан'); },
        error => { global.editorIsLoaded = true; return alert('Не удалость создать лист графа'); }
      );
    }
    catch(e){
      global.editorIsLoaded = true;
      return alert('Сценарий не сохранен, ошибка ' + e.message)
    }
  };

  const [cafes, setCafes] = useState('');
  const [options, setOptions] = useState('');
  const [displayLoading, setDisplayLoading] = useState('block');
  const [displaySaving, setDisplaySaving] = useState('none');

  let search = window.location.search;
  search = search.split('=');
  const cafeId = ((search.length>0)||(search[0] === '?cafeid'))? search[1] : false;
  
  useEffect(() => {
    async function datesInit() {
      const data = (await getAllCafeInfo()) || [];
      if(cookies.get('tempGraph')) {
        data.splice(0, 0, {
            cafeId: 'tempGraphCached',
            cafeName: 'Новый граф',
            ssBackId: cookies.get('tempGraph'),
        });
      }
      data.push({
          cafeId: 'tempGraph',
          cafeName: 'Другой граф',
      });
      setCafes(data);      
      setOptions(data.map((cafe) => {
        return <option value={cafe.cafeId} key={cafe.cafeId}>{cafe.cafeName}</option>;
      }));
      //setDropDown(createDropDown(cafes));
    }    
    datesInit();
  }, []);

  if(!cafes)
    return 'Получаем информацию о кафе от ' + process.env.REACT_APP_FEEDMER_URL+`/getAllCafeInfo....`;
  let cafe = getCafeById(cafeId, cafes);
  if((cafe) && (!cafe.ssBackId)) {
    cafe.ssBackId = prompt('ID гугл-таблицы:');
    if(cafe.ssBackId) {
      cookies.set(cafe.cafeId, cafe.ssBackId, { path: '/' });
      window.location.search = '?cafeId=tempGraphCached';
      return;
    }
    else cafe = null;
  }   
  if(cafe){ 
    try {
      return (
        <div className="App">
          <div style={{ textAlign: "left", width: "100vw", height: "100vh" }}>
            <div className='header'>
              <input type='button' value="Сохранить" className='menu_button' onClick={clickSave} />
              <input type='button' value="Выбор кафе" className='menu_button' onClick={clickChangeCafe} />
              {//<input type='button' value="Импорт" class='menu_button' onClick={clickImport} />
              }
              <input type='button' value="Автоперестановка" className='menu_button' onClick={clickArrange} />
              <input type='button' value="Создать лист графа" className='menu_button' onClick={generateGraphSheet} />
              <input type='button' value="Создать шаг" className='step_button' onClick={clickCreateStep} />
              <b>{cafe.cafeName}</b>
            </div>
            <div  style={{display: displayLoading}}>
              <h1> Загружаем... </h1>
            </div>
            <div  style={{display: displaySaving}}>
              <h1> Сохраняем... </h1>
            </div>
            <div id='canvas' ref={el => (init(el, cafe))
              .then((res) => { if (res !== false) setDisplayLoading('none') } )
              .catch(e => {
                try {
                  if(!e.message.includes('style')) throw e;//setDisplayLoading('block');
                  //else throw e;
                } catch { 
                  alert('Не удалось загрузить граф ' +e);
                  console.error(e);
                  setDisplayLoading('none')
                }
                }) 
              } />
          </div>
        </div>
      );
    }
    catch(e) {
      return alert('Не удалось отобразить выбранный граф');
    }
  }
  else{
    return (
      <div className="App">
        <h1>FeedMer chatbot constructor</h1>
        <div style={{ textAlign: "left" }}>
          <form action="" method="GET">
            <label>
            Выберите кафе:
            <select value={cafes} name='cafeid' onChange={(event) => setCafes(event.target.value)}>
                {options}
            </select>
            </label>
            <input type="submit" value="Выбрать" className='menu_button' />
          </form>
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);