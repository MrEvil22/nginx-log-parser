const fs = require("fs/promises")
const {watchFile} = require("fs")
const path = require("path")
const logsPath = path.resolve(__dirname,"logs.txt")
const UAParser = require("ua-parser-js")

let urlHits,results

function extractUA(logString) {
    const index = logString.indexOf("Mozilla/5.0")
    return logString.substring(index)
}

function botDetection(logString){
    const index = logString.indexOf("Mozilla/5.0")
    if(index < 0){
        return false
    }
    let ua = logString.substring(index)
    ua = ua.substring(0,ua.length - 2)
    return ua.length > 20 && !ua.includes("compatible");
}

function uaExtractor(logString){
    const parser = new UAParser()
    const {browser,os,cpu} = parser.setUA(extractUA(logString)).getResult()
    let res = browser.name + browser.version + os.name + os.version + cpu.architecture
    results.realUA.push(res)
    results.realUA.push(res)
}

async function readLogs() {
    urlHits = {}
    results = {bots:0,realUA:[],getRequests: []}
    try{
        const logs = await fs.readFile(logsPath,{encoding: "utf8"})
        const logsArray = logs.split("\n")
        logsArray.forEach(value => {
            if(botDetection(value)){
                const urlRegex = /"GET ([\s\S]+?)"/g
                const timeRegex = /\[([\s\S]+)]/g
                if(urlRegex.test(value)){
                    const res = value.match(urlRegex)
                    const time = value.match(timeRegex)
                    results.getRequests.push([res[0],time[0]])
                }
                uaExtractor(value)
            }
        })
        const set = new Set(results.realUA)
        results.realUA = Array.from(set)
        results.getRequests.forEach((value,index) => {
            if(value[0].includes(".css ")){
                const realUrl = results.getRequests[index -1]
                const url = realUrl[0].split(" ")[1]
                const time = realUrl[1].substring(1,realUrl[1].length - 2).split("/")
                const date = time[0] + " " + time[1]
                if(!urlHits.hasOwnProperty(date)){
                    urlHits[date] = []
                }
                urlHits[date].push(url)
            }
        })
        for(let key in urlHits){
            const data = {}
            urlHits[key].forEach((value) => {
                if(!data.hasOwnProperty(value)){
                    data[value] = 1
                }
                data[value] ++
            })
            urlHits[key] = data
        }
        for(let key in urlHits){
            console.log("\x1b[31m","-------------------------- ","\x1b[34m",key,"\x1b[31m"," --------------------------")
            for(let key2 in urlHits[key]){
                console.log("\x1b[35m",key2,"\x1b[30m"," : " ,"\x1b[35m",urlHits[key][key2])
            }
        }
    }catch (e) {
        console.log(e)
    }
}

readLogs()
watchFile(logsPath,readLogs)
