// If absolute URL from the remote server is provided, configure the CORS
// header on that server.
var url = 'test/PZO14006-BX Dawn of the Frogs.pdf';

// Loaded via <script> tag, create shortcut to access PDF.js exports.
var { pdfjsLib } = globalThis;

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.mjs';

let pdf = null, page = null;

const preview = document.getElementById("preview");
let edgeFirst = true;
/**
 * 
 * @param {*} pdf
 * @param {*} page
 * @param {*} txt
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 */
function readPage(pdf, page, txt, canvas, ctx) {
	const pageWidth = page.view[2];
	const pageHeight = page.view[3];
	const { items, styles } = txt;
	//
	const tuplesByColumn = [[], []];
	const allTuples = [];
	//
	function parseEdge(id) {
		let fd = document.getElementById("edge-" + id);
		if (edgeFirst) {
			fd.addEventListener("input", (_) => {
				loadPage();
			});
		}
		return parseFloat(fd.value) / 100;
	}
	const edgeX = parseEdge("x");
	const edgeLeft = pageWidth * (parseEdge("left") + edgeX);
	const edgeRight = pageWidth * (parseEdge("right") + edgeX);
	const edgeTop = pageHeight * parseEdge("top");
	const edgeBottom = pageHeight * parseEdge("bottom");
	const edgeMiddle = (edgeLeft + edgeRight) / 2;
	edgeFirst = false;
	//
	ctx.strokeStyle = "#4499FF40";
	ctx.lineWidth = 1;
	var scaleX = canvas.width / pageWidth;
	var scaleY = canvas.height / pageHeight;
	function drawRect(x, y, w, h) {
		ctx.beginPath();
		ctx.rect(x * scaleX, y * scaleY, w * scaleX, h * scaleY)
		ctx.closePath();
		ctx.stroke();
	}
	//
	for (let item of items) {
		const { transform, str, fontName, width, height } = item;
		const x = transform[4];
		const y = pageHeight - transform[5] - height;
		const right = x + width;
		const bottom = y + height;
		if (x < edgeLeft || right > edgeRight || y < edgeTop || bottom > edgeBottom) {
			//drawRect(x, y, width, height);
			console.log("OOB", item);
			continue;
		}
		if (x < edgeMiddle && right > edgeMiddle) {
			//drawRect(x, y, width, height);
			console.log("Middle", item);
			continue;
		}
		drawRect(x, y, width, height);
		const col = tuplesByColumn[right < edgeMiddle ? 0 : 1];
		const tuple = {str, x, y, width, height, fontName, item};
		col.push(tuple);
		allTuples.push(tuple);
	}
	//
	function findMostCommonEx(indexer) {
		const map = new Map();
		const pairs = [];
		function add(val, obj = null) {
			let arr = map.get(val);
			if (arr == null) {
				arr = [];
				map.set(val, arr);
				pairs.push({ val, arr });
			}
			arr.push(obj ?? val);
		}
		indexer(add);
		let bestVal = null;
		let bestCount = -1;
		for (let pair of pairs) {
			if (pair.arr.length > bestCount) {
				bestCount = pair.arr.length;
				bestVal = pair.val;
			}
		}
		return bestVal;
	}
	function findMostCommon(tuples, getter) {
		return findMostCommonEx(add => {
			for (let tuple of tuples) {
				add(getter(tuple));
			}
		});
	}
	//
	const commonHeight = findMostCommonEx((add) => {
		for (let tuple of allTuples) {
			let h = tuple.height;
			if (h != 0) add(h, tuple);
		}
	});
	const commonFont = findMostCommon(allTuples, t => t.fontName);
	//
	const fontIsItalic = new Map();
	const fontIsBold = new Map();
	for (let style of Object.keys(styles)) {
		let font = page.commonObjs.get(style);
		if (!font) continue;
		if (/italic/i.test(font.name)) {
			fontIsItalic.set(style, true);
		}
		if (/bold/i.test(font.name)) {
			fontIsBold.set(style, true);
		}
		//console.log(fontName, font, font.name);
	}
	//
	preview.innerHTML = "";
	console.log({commonHeight, commonFont, tuplesByColumn});
	for (let colID = 0; colID < 2; colID += 1) {
		if (colID == 1) preview.append(document.createElement("hr"));
		let tuples = tuplesByColumn[colID];
		const commonX = findMostCommon(tuples, t => t.x);
		//
		let lastX = null, lastY = null;
		let wasCommon = true;
		let wasHeader = false;
		let wasIndented = false;
		let dest = document.createElement("P");
		preview.append(dest);
		for (let tuple of tuples) {
			let snip = tuple.str.trim();
			if (snip == "") continue;
			//
			let isHeader = tuple.height != commonHeight;
			let isCommon = tuple.fontName == commonFont;
			let isBold = fontIsBold.has(tuple.fontName);
			let isItalic = fontIsItalic.has(tuple.fontName);
			if ((isBold || isItalic) && !isHeader) isCommon = true;
			//
			let isIndented = null;
			if (tuple.y != lastY) {
				// don't want to check for indent on `In <i>A Fistful of Flowers</i>, your players`
				isIndented = tuple.x != commonX;
			}
			//
			if (
				(isIndented != null && isIndented && !wasIndented)
				|| isHeader != wasHeader
				|| isCommon != wasCommon && isIndented != null
			) {
				if (dest.childNodes.length == 0) dest.remove();
				dest = document.createElement(isHeader ? "h2" : "p");
				preview.append(dest);
			}
			if (dest.childNodes.length > 0) dest.append(" ");
			if (isHeader) {
				dest.append(snip);
			} else if (isBold) {
				let span = document.createElement("b");
				span.append(snip);
				dest.append(span);
			} else if (isItalic) {
				let span = document.createElement("i");
				span.append(snip);
				dest.append(span);
			} else {
				dest.append(snip);
			}
			lastX = tuple.x;
			lastY = tuple.y;
			wasHeader = isHeader;
			wasCommon = isCommon;
			if (isIndented != null) {
				wasIndented = isIndented;
			}
		}
	}
	//
	ctx.beginPath();
	ctx.rect(
		edgeLeft / pageWidth * canvas.width,
		edgeTop / pageHeight * canvas.height,
		(edgeRight - edgeLeft) / pageWidth * canvas.width,
		(edgeBottom - edgeTop) / pageHeight * canvas.height
	);
	ctx.closePath();
	ctx.moveTo(edgeMiddle / pageWidth * canvas.width, edgeTop / pageHeight * canvas.height);
	ctx.lineTo(edgeMiddle / pageWidth * canvas.width, edgeBottom / pageHeight * canvas.height);
	ctx.stroke();
}

let pageNumber = 1;
let loadingPage = false;
let loadAnother = false;
async function loadPage() {
	if (loadingPage) {
		loadAnother = true;
		return;
	}
	loadingPage = true;
	page = await pdf.getPage(pageNumber);
	loadingPage = false;
	if (loadAnother) {
		loadAnother = false;
		await loadPage();
		return;
	}
	//
	let txt = await page.getTextContent();
	window.pdf = pdf;
	window.pdfPage = page;
	window.pdfText = txt;
	console.log('Page loaded');
	
	var scale = 1.5;
	var viewport = page.getViewport({scale: scale});
	
	// Prepare canvas using PDF page dimensions
	var canvas = document.getElementById('the-canvas');
	var context = canvas.getContext('2d');
	canvas.height = viewport.height;
	canvas.width = viewport.width;
	
	// Render PDF page into canvas context
	var renderContext = {
		canvasContext: context,
		viewport: viewport
	};
	var renderTask = page.render(renderContext);
	renderTask.promise.then(function () {
		console.log('Page rendered');
		readPage(pdf, page, txt, canvas, context);
	});
}
//
let pageField = document.getElementById("page-number");
pageField.addEventListener("input", (_) => {
	let newNumber = parseInt(pageField.value);
	if (newNumber == pageNumber) return;
	pageNumber = newNumber;
	loadPage().catch(() => {
		loadingPage = false;
	});
});

// Asynchronous download of PDF
var loadingTask = pdfjsLib.getDocument({ url });
loadingTask.promise.then(function(_pdf) {
	pdf = _pdf;
	console.log('PDF loaded');

	// Fetch the first page
	loadPage();
	/*
	var pageNumber = 5;
	pdf.getPage(pageNumber).then(async function(page) {
		let txt = await page.getTextContent();
		window.pdf = pdf;
		window.pdfPage = page;
		window.pdfText = txt;
		console.log('Page loaded');
		
		var scale = 1.5;
		var viewport = page.getViewport({scale: scale});
		
		// Prepare canvas using PDF page dimensions
		var canvas = document.getElementById('the-canvas');
		var context = canvas.getContext('2d');
		canvas.height = viewport.height;
		canvas.width = viewport.width;
		
		// Render PDF page into canvas context
		var renderContext = {
			canvasContext: context,
			viewport: viewport
		};
		var renderTask = page.render(renderContext);
		renderTask.promise.then(function () {
			console.log('Page rendered');
			readPage(pdf, page, txt, canvas, context);
		});
	});
	*/
}, function (reason) {
	// PDF loading error
	console.error(reason);
});