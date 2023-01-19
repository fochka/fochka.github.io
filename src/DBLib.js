
export default async function (){
    try {
        const response = await fetch(process.env.REACT_APP_FEEDMER_URL+`/getAllCafeInfo`);
        const data = await response.text();
        return JSON.parse(data);
    } catch (e) {
        console.error(`getAllCafeInfo failed`, e.message || e);
    }
}