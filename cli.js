const browser_releaseDates = require('./browser-releaseDates.js')
const {get_browser_info} = require('./lib.js')

const fs = require("fs")
const uas = fs.readFileSync(process.stdin.fd).toString().split("\n")

for (const ua of uas) {
    console.log(get_browser_info(browser_releaseDates, ua))
}
