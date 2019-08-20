const lemmas = require("../data/GreekResources-LXXLemma-compilation")
const fs = require("fs")

//provides greekWordList
require("../data/GreekResources/GreekWordList.js")

const bc = require('beta-code-js')
// If these files are missing, you need to run get-lxx-files.js
const mlxxRoot = __dirname + "/../data/lxx_files/"

const filenameMap = {
	"JudgesB": "JudgB",
	"JudgesA": "JudgA",
	"1Kings": "1Kgs",
	"2Kings": "2Kgs",
	"1Chron": "1Chr",
	"2Chron": "2Chr",
	"1Esdras": "1Esd",
	"2Esdras": "2Esd",
	"Esther": "Esth",
	"Judith": "Jdt",
	"TobitBA": "TobBA",
	"TobitS": "TobS",
	"Psalms": "Ps",
	"Proverbs": "Prov",
	"Qoheleth": "Eccl",
	"Canticles": "Song",
	"Wisdom": "Wis",
	"Sirach": "Sir",
	"Hosea": "Hos",
	"Micah": "Mic",
	"Obadiah": "Obad",
	"Nahum": "Nah",
	"Habakkuk": "Hab",
	"Haggai": "Hag",
	"Malachi": "Mal",
	"Isaiah": "Isa",
	"Baruch": "Bar",
	"DanielOG": "DanOG",
	"DanielTh": "DanTh"
}
const bookMap = {
	"JoshB": "Josh",
	"JoshA": "Josh",
	"JudgB": "Judg",
	"JudgA": "Judg",
	"1Sam/K": "1Sam",
	"2Sam/K": "2Sam",
	"1/3Kgs": "1Kgs",
	"2/4Kgs": "2Kgs",
	"Odes": "Od",
	"EpJer": "EpJer",
	"Lam": "Lam",
	"BelOG": "Bel"
}

const allWords = []
let valuesToInsert = []
const missingDefs = []

fs.readdir(mlxxRoot, (err, filenames) => {
	if (err) {
		console.log(err)
		return
	}
	// let fileLimit = 0
	filenames.forEach((path) => {
		// if (fileLimit++ >2) return
		// const path = "37.PsSol.mlxx"
		if (path.endsWith(".mlxx")) {
			console.log(path, fails.length)
			const data = fs.readFileSync(mlxxRoot + path, "utf8")
			parseFile(data.split("\n"), path.substr(3).replace(/(\.?\d)?\.mlxx/, ""))
		}
	})
	if (fails.length > 0) {
		fs.writeFileSync("../output/failed-enrichments.json", JSON.stringify(fails, null, 2), 'utf8')
		console.log("There were some fails:", fails.length)
	}
	if (missingDefs.length > 0) {
		fs.writeFileSync("../output/failed-defs.json", JSON.stringify(missingDefs, null, 2), 'utf8')
		console.log("There were missing defs:", missingDefs.length)
	}

	if (valuesToInsert.length > 0) {
		bulkInsert(valuesToInsert)
		valuesToInsert = []
	}
	console.log("Completion...")
	completeProcess()
	console.log("Writing ../output/allwords.json")
	fs.writeFileSync("../output/allwords.json", JSON.stringify(allWords, null, 2), 'utf8')
})


const exceptions = {
	"Lam": { ch: 0, v: 1 },
	"Bel": { ch: 1, v: 1 }
}

let fails = []

let count = 0
const parseFile = (lines, filename) => {
	// let bulkInsertCounter = 0
	let book = ""
	let chapter = 0
	let verse = 0
	let word_in_verse = -1
	let word_in_verse_offset = 0
	for (i in lines) {
		line = lines[i].trim()
		if (!line) continue
		if (+i === 5558 && filename === "DanielOG") {
			// Dan 5:0
			book = "Dan"
			chapter = 5
			verse = 0
			word_in_verse = -1
			word_in_verse_offset = 0
		}
		else if (line === "Bel 31/32") {
			verse = 31 //That's what it is in the lemmas file
			word_in_verse = -1
			word_in_verse_offset = 0
		}
		else if (line === "Bel 15-17") {
			verse = 15 //That's what it is in the lemmas file
			word_in_verse = -1
			word_in_verse_offset = 0
		}
		else if (/^\w+$/.test(line)) { // Bel (some files start on v1, some on v0)
			book = line
			if (filename === "PsSol" || filename === "Odes")
				chapter++
			else
				chapter = 1
			verse = 0
			if (Object.keys(exceptions).includes(line)) {
				const k = Object.keys(exceptions).find(x => x === line)
				chapter = exceptions[k]["ch"]
				verse = exceptions[k]["v"]
			}
			word_in_verse = -1
			word_in_verse_offset = 0
		}
		else if (/.+ .+:.+/.test(line)) { // Ruth 1:1
			const lineParts = line.split(/[\s|:]/)
			book = lineParts[0]
			chapter = lineParts[1]
			verse = lineParts[2]
			word_in_verse = -1
			word_in_verse_offset = 0
		}
		else if (/.+ [1-9]+/.test(line)) { // Obad 1 (books with 1 chapter)
			const lineParts = line.split(/\s/)
			book = lineParts[0]
			chapter = 1
			verse = lineParts[1]
			word_in_verse = -1
			word_in_verse_offset = 0
		}
		else {
			use_lemmas = true
			word_in_verse++
			count++
			word = bc.betaCodeToGreek(line.substring(0, 25).trim())
			old_root = bc.betaCodeToGreek(line.substring(36).replace(/\s+/, ' '))
			real_lemma = bc.betaCodeToGreek(line.substring(36).replace(/\s+/, ' '))
			lemma_key = bc.betaCodeToGreek(line.substring(36).replace(/\s+/, ' '))
			morph = line.substring(25, 36).trim().replace(/\s+/, ' ')

			let primaryKey = filename
			if (!lemmas[primaryKey])
				primaryKey = filenameMap[filename]

			if (!primaryKey) {
				console.log("oh no", filename)
			}

			let secondaryKey = `${book}.${chapter}.${verse}`
			if (!lemmas[primaryKey][secondaryKey])
				secondaryKey = `${bookMap[book]}.${chapter}.${verse}`

			let extradetails = {}
			if (!lemmas[primaryKey][secondaryKey]) {
				fails.push(`(${filename})[${primaryKey}] (${book})[${secondaryKey}] [${word_in_verse}] + ${i}:${word}`)
				oth = null
				return
			}
			else {
				extradetails = lemmas[primaryKey][secondaryKey][word_in_verse + word_in_verse_offset]
			}

			if (!extradetails || !extradetails.hasOwnProperty("lemma")) {
				console.log(primaryKey, secondaryKey, word_in_verse, word)
			}
			if (names_in_hosea.includes(line)) {
				console.log(line)
				console.log(chapter, verse, word, old_root)
				word_in_verse_offset += line.substring(0, 25).split("-").length - 1
				let lemma = old_root[0].toUpperCase() + old_root.replace(/\ /g, "-").slice(1)
				extradetails = {
					lemma,
					key: lemma
				}
			}
			const wordDetails = {
				id: count,
				word_in_verse,
				book,
				chapter,
				verse,
				word,
				trailer: " ",
				old_root,
				real_lemma: extradetails.lemma,
				lemma_key: extradetails.key,
				morph
			}
			if (greekWordList[extradetails.key].hasOwnProperty("def")) {
				wordDetails["gloss"] = greekWordList[extradetails.key]["def"]
			}
			else {
				missingDefs.push(extradetails.key)
			}

			// 	wordDetails["real_lemma"] = extradetails.lemma
			// if (extradetails && extradetails.hasOwnProperty("key"))
			// 	wordDetails["lemma_key"] = extradetails.key

			allWords.push(wordDetails)
			// valuesToInsert.push(wordDetails)
			// valuesToInsert.append("(\'" + str(count) + "\', \'" + book_name + "\', \'" + str(chapter_nr) + "\', \'" + str(verse_nr) + "\', \'" +  str(word_nr) + "\', \'" + word + "\', \'" + root_word + "\', \'" + morphology + "\')")

			// if (valuesToInsert.length >= 500) {
			// 	bulkInsert(valuesToInsert)
			// 	valuesToInsert = []
			// }
		}
	}
}

// let bulkDoneCounter = 0
// let tableStillToBeCreated = true
// const combinedParam = (word) => {
// 	return `("${word["book_name"]}",
// 		"${word["chapter_nr"]}",
// 		"${word["verse_nr"]}",
// 		"${word["word_nr"]}",
// 		"${word["word"]}",
// 		"${word["old_root"]}",
// 		"${word["real_lemma"]}",
// 		"${word["lemma_key"]}",
// 		"${word["morph"]}",
// 		"${word["gloss"]}")`
// }
// const bulkInsert = (wordsList) => {
// 	// db.serialize(() => {
// 		const params = []
// 		wordsList.forEach((word) => {
// 			params.push(combinedParam(word))
// 		})
// 		const insertQuery = `INSERT INTO EnrichedContent (
// 			book_name,
// 			chapter_nr,
// 			verse_nr,
// 			word_nr,
// 			word,
// 			old_root,
// 			real_lemma,
// 			lemma_key,
// 			morph,
// 			gloss) VALUES` + params.join(", ")
// 		// db.run("BEGIN")
// 		db.run(insertQuery, doneOneDay())
// 		// db.run("COMMIT")
// 		if (++bulkDoneCounter % 10 === 0) {
// 			console.log(bulkDoneCounter*wordsList.length, "insertions done")
// 		}
// 	// })
// }
// let doneTally = 0
// const doneOneDay = () => {
// 	doneTally++
// 	return () => {
// 		doneTally--
// 		setTimeout(() => {
// 			if (doneTally === 0) {
// 				db.close()
// 			}
// 			else {
// 				console.log("Still to go:", doneTally)
// 			}
// 		}, 1000)
// 	}
// }

const sqlFile = `
DROP TABLE IF EXISTS EnrichedContent;
CREATE TABLE EnrichedContent (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		book_name TEXT NOT NULL,
		chapter_nr TEXT NOT NULL,
		verse_nr TEXT NOT NULL,
		word_nr TEXT NOT NULL,
		word TEXT NOT NULL,
		old_root TEXT NOT NULL,
		real_lemma TEXT,
		lemma_key TEXT,
		morph TEXT,
		gloss TEXT
);
`
const insertValues = (wordArray) => (`
INSERT INTO EnrichedContent VALUES
${wordArray.map(w => {
	const ordered_word_values = [
		w["book_name"],
		w["chapter_nr"],
		w["verse_nr"],
		w["word_nr"],
		w["word"],
		w["old_root"],
		w["real_lemma"],
		w["lemma_key"],
		w["morph"],
		w["gloss"]
	]
	return `(NULL, "${ordered_word_values.join('","')}")`
}).join(",\n")};`)
const paginateArray = (array, sectionLength) => {
	const mutableArray = array.slice()
	const ret = []
	while (mutableArray.length > 0) {
		ret.push(mutableArray.splice(0, sectionLength))
	}
	return ret
}
const completeProcess = () => {
	const { execSync } = require('child_process')

	console.log(" - building sql query")
	const fileOutput = sqlFile +
		paginateArray(allWords, 999).map(wordChunk => insertValues(wordChunk)).join("")
	console.log(" - writing sql file")
	fs.writeFileSync("../output/EnrichedContent.sql", fileOutput, 'utf8')
	console.log(" - importing to sqlite")
	console.log("     (Sorry, this will take a while: like > 10min.")
	console.log("      And there's not going to be any indication")
	console.log("      it's succeeding so just trust me and wait)")
	let stdout = execSync('sqlite3 ../output/lxx.db < ../output/EnrichedContent.sql')
	console.log("Done")
}