// If absolute URL from the remote server is provided, configure the CORS
// header on that server.
var url = 'test/PZO14006-BX Dawn of the Frogs.pdf';

// Loaded via <script> tag, create shortcut to access PDF.js exports.
const { pdfjsLib } = globalThis;
const { OPS } = pdfjsLib;

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.mjs';

let pdf = null, page = null;

const preview = document.getElementById("preview");
function readPage(pdf, page, txt, canvas, ctx, scale, first) {
	window.hxReadPage(pdf, page, txt, canvas, ctx, scale, first, preview);
}

let readingPageImages = false;
const pageImageDiv = document.getElementById("page-images");
async function readPageImages() {
	readingPageImages = true;
	let ops = await page.getOperatorList();
	readingPageImages = false;
	//
	let { fnArray, argsArray } = ops;
	let n = fnArray.length;
	let found = new Set();
	function getObjAsync(objects, objectID) {
		return new Promise(resolve => objects.get(objectID, resolve));
	}
	function addImage(pdfImage) {
		if (!pdfImage || !pdfImage.width || !pdfImage.height || !pdfImage.data) return;
		let canvas = document.createElement("canvas");
		canvas.width = pdfImage.width;
		canvas.height = pdfImage.height;
		console.log(pdfImage.data);
		//
		let ctx = canvas.getContext("2d");
		let imageData = ctx.createImageData(pdfImage.width, pdfImage.height);
		imageData.data.set(pdfImage.data);
		ctx.putImageData(imageData, 0, 0);
		//
		var slot = document.createElement("div");
		slot.classList.add("slot");
		slot.append(canvas);
		pageImageDiv.append(slot);
	}
	//
	pageImageDiv.innerHTML = "";
	for (let i = 0; i < n; i++) {
		let fn = fnArray[i];
		if (fn == OPS.paintImageXObject || fn == OPS.paintImageXObjectRepeat) {
			let args = argsArray[i];
			if (!Array.isArray(args)) continue;
			//
			let objectID = args[0];
			if (!objectID || found.has(objectID)) continue;
			//
			found.add(objectID);
			let objects = objectID.startsWith("g_") ? page.commonObjs : page.objs;
			addImage(await getObjAsync(objects, objectID));
		} else if (fn == OPS.paintInlineImageXObject) {
			let args = argsArray[i];
			if (!Array.isArray(args)) continue;
			addImage(args[0]);
		}
	}
}
var showImagesButton = document.getElementById("show-images");
showImagesButton.addEventListener("click", e => {
	if (readingPageImages) return;
	readPageImages().catch(() => {
		readingPageImages = false;
	});
});

let pageScaleField = document.getElementById("page-scale");
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
	
	let scale = parseFloat(pageScaleField.value);
	if (isNaN(scale)) scale = 100;
	if (scale < 10) scale = 10;
	if (scale > 1000) scale = 1000;
	scale /= 100;
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
	pageImageDiv.innerHTML = "";
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
	if (num < 1) num = 1;
	return num;
}
function flipPage(number = null, set = false) {
	number ??= getPageNumber();
	if (set) pageField.value = "" + number;
	if (pageNumber == number) return;
	pageNumber = number;
	loadPage();
}
pageScaleField.addEventListener("change", e => {
	loadPage();
});
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
};

(function initCopyHTML() {
	let button = document.getElementById("copy-html");
	let label = button.value;
	let revertTimeout = null;
	let blink = function() {
		if(revertTimeout != null) {
			window.clearTimeout(revertTimeout);
		}
		button.value = "Copied!";
		revertTimeout = window.setTimeout(function() {
			return button.value = label;
		},1300);
	};
	button.addEventListener("click", e => {
		navigator.clipboard.writeText(preview.innerHTML);
		blink();
	});
})();


function loadPDF(params) {
	let withImages = document.getElementById("extract-images").checked;
	if (withImages) params.isOffscreenCanvasSupported = false;
	pdfjsLib.getDocument(params).promise.then(async(_pdf) => {
		showImagesButton.disabled = !withImages;
		pdf = _pdf;
		console.log('PDF loaded');
		document.getElementById("page-count").innerText = pdf.numPages;
		// Fetch the first page
		loadPage();
	}, function (reason) {
		// PDF loading error
		console.error(reason);
	});
}
if (location.hostname == "localhost") {
	loadPDF({
		url: "test/PZO14006-BX Dawn of the Frogs.pdf"
	});
}
const filePicker = document.getElementById("file-picker");
filePicker.addEventListener("change", async (e) => {
	const file = filePicker.files[0];
	if (!file) return;
	const bytes = await file.bytes();
	loadPDF({ data: bytes });
});
document.getElementById("pick-pdf").addEventListener("click", e => {
	filePicker.click();
});