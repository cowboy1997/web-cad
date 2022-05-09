const zlib = require('zlib')
const fs = require('fs')
const html = fs.readFileSync('DwgApi.wasm')
var a= zlib.gzipSync(html)

const writer = fs.createWriteStream('a.wasm', {flags: 'w'})
//写入数据到流
writer.write(a)
console.log(a);