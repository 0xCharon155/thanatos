const { generateRebirthMetadata } = require("./lib/services/aiLoreService.js");
generateRebirthMetadata(["DEADFROG", "RUGPULL", "SAFEMOON2"], 1).then(m => console.log(JSON.stringify(m, null, 2)));
