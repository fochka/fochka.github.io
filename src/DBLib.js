
export default async function() {
    try {
        /*/return [{ // <<<<< Delete on prod!
            cafeId: '666',
            cafeName: 'Тест редактор графов',
            ssBackId: '1XxQm9w1zkwJ57p3U-1LQj-SPjyeBmjINL-e1NPnNDys',
        }]/**/
        /*/return [{ // <<<<< Delete on prod!
            cafeId: '0',
            cafeName: 'Мама Пицца',
            ssBackId: '1-TgZbqNA0QeiE51pXMTHR_4SMBYd-My-_sD-nUak2oc',
        },
        { 
            cafeId: '1',
            cafeName: 'резерв Мама Пицца',
            ssBackId: '1aWoBs_DQdy7jD2WnIGM8BXGdoF40E0fAOO4VBGEbKBY',
        }]/**/
        const response = await fetch(process.env.REACT_APP_FEEDMER_URL+`/getAllCafeInfo`, {
            credentials: 'include'
          });
        const data = await response.text();
        return JSON.parse(data);
    } catch (e) {
        console.error(`getAllCafeInfo failed`, e.message || e);
    }
}

function getCookie(key) {
    var b = document.cookie.match("(^|;)\\s*" + key + "\\s*=\\s*([^;]+)");
    return b ? b.pop() : "";
  }