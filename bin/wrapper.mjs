// If absolute URL from the remote server is provided, configure the CORS
// header on that server.
var url = 'test/PZO14006-BX Dawn of the Frogs.pdf';

// Loaded via <script> tag, create shortcut to access PDF.js exports.
var { pdfjsLib } = globalThis;

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.mjs';

let pdf = null, page = null;

const preview = document.getElementById("preview");
/**
 * 
 * @param {*} pdf
 * @param {*} page
 * @param {*} txt
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 */
function readPage(pdf, page, txt, canvas, ctx, scale, first) {
	window.hxReadPage(pdf, page, txt, canvas, ctx, scale, first, preview);
}

let pageNumber = 1;
let loadingPage = false;
let loadAnother = false;
let copyCanvas = document.createElement("canvas");
let copyContext = copyCanvas.getContext("2d");
let lastTextContent = null;
let lastScale = 1;
async function loadPage() {
	if (loadingPage) {
		loadAnother = true;
		return;
	}
	loadingPage = true;
	let trouble = false;
	try {
		page = await pdf.getPage(pageNumber);
	} catch (x) {
		console.error("Error loading page:", x);
		trouble = true;
	}
	loadingPage = false;
	if (loadAnother) {
		loadAnother = false;
		await loadPage();
		return;
	}
	if (trouble) return;
	//
	let txt = await page.getTextContent();
	lastTextContent = txt;
	window.pdf = pdf;
	window.pdfPage = page;
	window.pdfText = txt;
	console.log('Page loaded');
	
	var scale = 1.5;
	lastScale = scale;
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
	renderTask.promise.then(() => {
		copyCanvas.width = canvas.width;
		copyCanvas.height = canvas.height;
		copyContext.drawImage(canvas, 0, 0);
		console.log('Page rendered');
		readPage(pdf, page, txt, canvas, context, scale, true);
	});
}
//
let pageField = document.getElementById("page-number");
function getPageNumber() {
	let num = parseInt(pageField.value);
	if (isNaN(num)) num = 1;
	//if (num < 1) num = 1;
	return num;
}
function flipPage(number = null, set = false) {
	number ??= getPageNumber();
	if (set) pageField.value = "" + number;
	if (pageNumber == number) return;
	pageNumber = number;
	loadPage();
}
pageField.addEventListener("input", _ => {
	flipPage();
});
document.getElementById("page-prev").addEventListener("click", _ => {
	flipPage(getPageNumber() - 1, true);
});
document.getElementById("page-next").addEventListener("click", _ => {
	flipPage(getPageNumber() + 1, true);
});

window.pdfHelper = {
	update: () => {
		var canvas = document.getElementById('the-canvas');
		var context = canvas.getContext('2d');
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(copyCanvas, 0, 0);
		readPage(pdf, page, lastTextContent, canvas, context, lastScale, false);
	}
}

// Asynchronous download of PDF
var loadingTask = pdfjsLib.getDocument({ url });
loadingTask.promise.then(function(_pdf) {
	pdf = _pdf;
	console.log('PDF loaded');
	document.getElementById("page-number")
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