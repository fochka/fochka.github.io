import React from "react";
import ReactDOM from "react-dom";
import init from "./editor";
import getAllCafeInfo from "./DBLib.js";

import "./styles.css";

global.stepOfPromoDispatch = "stepOfPromoDispatch";
global.stepOfDeliveryOptions = "stepOfDeliveryOptions";
global.stepOfSbpBankChanging = "stepOfSbpBankChanging";
global.stepOfCafeChanging = "stepOfCafeChanging";
global.stepOfName = "stepOfName"; //6
global.stepOfAddr = "stepOfAddr"; //6
global.stepOfTime = "stepOfTime";//7
global.stepOfWhereToEat = "stepOfWhereToEat";
global.stepOfTel = "stepOfTel";//8
global.stepOfPayWay = "stepOfPayWay";//9
global.stepOfPayWayObedruNum = "stepOfPayWayObedruNum";
global.stepOfLast = "stepOfLast";//10
global.stepOfInviteOrComment = "stepOfInviteOrComment";//11
global.stepOfInvite = "stepOfInvite";//12
global.stepOfComment = "stepOfComment";//13
global.stepOfCommentSave = "stepOfCommentSave";//14
global.stepOfBackFromComment = "stepOfBackFromComment";
global.stepTooLate = "stepTooLate";
global.stepOfFeedbackBot = "stepOfFeedbackBot";
global.stepOfFeedbackFood = "stepOfFeedbackFood";
global.stepOfFeedbackReadyInTime = "stepOfFeedbackReadyInTime";
global.stepOfFeedbackAgain = "stepOfFeedbackAgain";
global.stepOfFeedbackWishes = "stepOfFeedbackWishes";
global.stepOfUnsubscribeWay = "stepOfUnsubscribeWay";
global.stepFeedback = "stepFeedback";
global.stepAfterUnsubscibe = "stepAfterUnsubscibe";
global.stepUnsubscribed = "stepUnsubscribed";
global.stepUnsubscribedByMessenger = "stepUnsubscribedByMessenger";
global.stepOfSettings = "stepOfSettings";
global.stepOfQuestion = "stepOfQuestion";
global.stepOfQuestionSend = "stepOfQuestionSend";
global.stepOfLiveCommunication = "stepOfLiveCommunication"
const {useState, useEffect} = React;

const clickSave = () => {
  if(!(global.editor)) return alert('Редактор еще не загружен');
  try{
    global.ss.saveRete(global.editor.toJSON()).then(
      result => {
        return alert('Сценарий сохранен')
      },
      error => {
        return alert('Сценарий не сохранен')
      }
    );
  }
  catch(e){
    return alert('Сценарий не сохранен, ошибка ' + e.message)
  }
};
const clickArrange = () => {
  if(!(global.editor)) return alert('Редактор еще не загружен');
  global.editor.trigger('arrange', 10);
}

function getCafeById(cafeId, cafes){
  if(!cafeId) return false;
  const cafe = cafes.find(val => val.cafeId == cafeId);
  return (cafe)? cafe : false;
}



function App() {
  function clickChangeCafe() {
    window.location.search = '';
    setCafes();
  }

  const [cafes, setCafes] = useState('');
  const [value, setValue] = useState('');

  let search = window.location.search;
  search = search.split('=');
  const cafeId = ((search.length>0)||(search[0] === '?cafeid'))? search[1] : false;
  
  useEffect(() => {
    async function datesInit() {
      const data = await getAllCafeInfo();
      setCafes(data);
      //setDropDown(createDropDown(cafes));
    }    
    datesInit();
  }, []);

  if(!cafes)
    return 'Получаем информацию о кафе...';
  const cafe = getCafeById(cafeId, cafes);
  if(cafe){
    return (
      <div className="App">
        <h1>FeedMer chatbot constructor</h1>
        <div style={{ textAlign: "left", width: "100vw", height: "100vh" }}>
          <div>
            <input type='button' value="Сохранить" onClick={clickSave} />
            <input type='button' value="Перестановка" onClick={clickArrange} />
            <input type='button' value="Выбор кафе" onClick={clickChangeCafe} />
          </div>
          <div ref={el => init(el, cafe)} />
        </div>
      </div>
    );
  }
  else{
    const options = cafes.map((cafe) => {
      return <option value={cafe.cafeId}>{cafe.cafeName}</option>;
    })
    return (
      <div className="App">
        <h1>FeedMer chatbot constructor</h1>
        <div style={{ textAlign: "left", width: "100vw", height: "100vh" }}>
          <form action="" method="GET">
            <label>
            Выберите кафе:
            <select value={value} name='cafeid' onChange={(event) => setValue(event.target.value)}>
                {options}
            </select>
            </label>
            <input type="submit" value="Выбрать" />
          </form>
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);