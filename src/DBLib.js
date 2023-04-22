import Cookies from 'universal-cookie';
const cookies = new Cookies();

export async function getAllCafeInfo() {
    try {
        let token = cookies.get('token');
        if (!token) {
            token = prompt('Токен для авторизации');
            if (!token) return;
            setToken(token);
        }
        const response = await fetch(process.env.REACT_APP_FEEDMER_URL+`/getAllCafeInfo/${token}`, {
            credentials: 'include'
        });
        const data = await response.text();
        return JSON.parse(data);
    } catch (e) {
        console.error(`getAllCafeInfo failed`, e.message || e);
    }
}

export function setToken(token) {
    const expires =  new Date(Date.now() + 3*30*24*60*60*1000);
    cookies.set('token', token, { path: '/', expires: expires });
}