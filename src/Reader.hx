import js.html.Element;
import js.lib.RegExp;
import js.lib.Object;
import pdf.PDFLabel;
import js.html.Console;
import js.html.CanvasRenderingContext2D;
import js.html.CanvasElement;
import pdf.PDFTextContent;
import pdf.PDFPage;
import js.html.InputElement;
import pdf.PDFDocument;
import js.Browser.document;
using StringTools;
import js.Browser.window;

class Reader {
	static var firstTime = true;
	static function getFieldFlag(name:String) {
		var fd:InputElement = cast document.getElementById("edge-" + name);
		if (firstTime) {
			fd.addEventListener("change", _ -> {
				pdf.PDFHelper.update();
			});
		}
		return fd.checked;
	}
	static function getFieldValue(name:String, defValue:Float = 0):Float {
		var fd:InputElement = cast document.getElementById("edge-" + name);
		if (firstTime) {
			fd.addEventListener("input", _ -> {
				pdf.PDFHelper.update();
			});
		}
		var num = Std.parseFloat(fd.value);
		if (Math.isNaN(num)) {
			fd.classList.add("invalid");
			return defValue;
		} else {
			fd.classList.remove("invalid");
			return num;
		}
	}
	static function getEdgeValue(name:String, defValue:Float = 0):Float {
		return getFieldValue(name, defValue * 100) / 100;
	}
	static function setEdgeValue(name:String, value:Float = 0) {
		var fd:InputElement = cast document.getElementById("edge-" + name);
		fd.value = (cast (value * 100)).toFixed(2);
	}
	@:expose("hxReadPage")
	public static function run(
		doc:PDFDocument, page:PDFPage, textContent:PDFTextContent,
		canvas:CanvasElement, ctx:CanvasRenderingContext2D, scale:Float,
		firstRender:Bool, preview:Element
	) {
		var pageWidth = page.width;
		var pageHeight = page.height;
		//
		var labelsByColumn = [[], []];
		var allLabels = [];
		function convertLabel(label:PDFLabel) {
			var mtx = label.transform;
			var x = mtx.tx;
			var y = pageHeight - mtx.ty - label.height;
			return osh([x, y, label.width, label.height], {
				text: label.str,
				right: x + label.width,
				bottom: y + label.height,
				font: label.fontName,
				raw: label,
			});
		}
		//
		if (firstRender && getFieldFlag("auto")) {
			var leftLabels = [], rightLabels = [];
			for (label in textContent.items.map(convertLabel)) {
				if (label.x < pageWidth * 0.4) {
					leftLabels.push(label);
				} else {
					rightLabels.push(label);
				}
			}
			var leftPos = leftLabels.findMostCommon(l -> l.x);
			var rightPos = rightLabels.findMostCommon(l -> l.x);
			if (leftPos.count > 4 && rightPos.count > 4) {
				var left = leftPos.value - 1;
				var center = rightPos.value - 1;
				var diff = center - left;
				var right = left + diff * 2;
				setEdgeValue("left", left / pageWidth);
				setEdgeValue("right", 1 - right / pageWidth);
			}
		}
		//
		var edgeX = getEdgeValue("x");
		var edgeLeft = pageWidth * (edgeX + getEdgeValue("left"));
		var edgeRight = pageWidth * (edgeX + 1 - getEdgeValue("right"));
		var edgeTop = pageHeight * (getEdgeValue("top"));
		var edgeBottom = pageHeight * (1 - getEdgeValue("bottom"));
		var edgeCenter = (edgeLeft + edgeRight) / 2;
		firstTime = false;
		//
		ctx.save();
		ctx.scale(scale, scale);
		ctx.strokeStyle = "#4499FF40";
		ctx.lineWidth = 2;
		//
		ctx.strokeRect(edgeLeft, edgeTop, edgeRight-edgeLeft, edgeBottom-edgeTop);
		ctx.drawLine(edgeCenter, edgeTop, edgeCenter, edgeBottom);
		//
		for (raw in textContent.items) {
			var label = convertLabel(raw);
			// clearly out of bounds?
			if (label.x < edgeLeft
				|| label.right > edgeRight
				|| label.y < edgeTop
				|| label.bottom > edgeBottom
			) {
				//drawRect(x, y, width, height);
				//Console.log("Out of bounds!", label);
				continue;
			}
			
			// overlapping center line? (e.g. portrait labels)
			if (label.x < edgeCenter && label.right > edgeCenter) {
				//drawRect(x, y, width, height);
				//Console.log("Middle", label);
				continue;
			}
			
			ctx.strokeRect(label.x, label.y, label.width, label.height);
			allLabels.push(label);
			labelsByColumn[label.right < edgeCenter ? 0 : 1].push(label);
		}
		//
		var commonHeight = allLabels.findMostCommonEx((arr, add) -> {
			for (label in arr) {
				var h = label.height;
				if (h > 0) add(h);
			}
		}).value;
		var commonFont = allLabels.findMostCommon(q -> q.font).value;
		
		// figure out which fonts are bold/italic:
		var fontProps = new Map();
		for (style in textContent.styles.keys()) {
			var font = page.commonObjs.getFont(style);
			if (font == null) continue;
			static var rxBold = new RegExp("(?:^|[a-z]|\\b)bold", "i");
			static var rxItalic = new RegExp("(?:^|[a-z]|\\b)italic", "i");
			var name = font.name;
			var bold = font.black ?? font.bold ?? rxBold.test(name);
			var italic = font.italic ?? rxItalic.test(name);
			fontProps[style] = osh([name, bold, italic]);
		}
		
		//
		preview.innerHTML = "";
		for (colID => labels in labelsByColumn) {
			if (colID == 1) preview.append(document.createElement("hr"));
			//
			var lastY = -1.0;
			var commonX = labels.findMostCommon(q -> q.x).value;
			var wasCommon = true;
			var wasHeader = false;
			var wasIndented = false;
			//
			var out:Element = document.createParagraphElement();
			preview.append(out);
			//
			for (label in labels) {
				var text = label.text.trim();
				if (text == "") continue;
				//
				var isHeader = label.height > commonHeight;
				var isCommon = label.font == commonFont;
				var font = fontProps[label.font];
				var isBold = font?.bold;
				var isItalic = font?.italic;
				// hopefully just inline formatting!
				if ((isBold || isItalic && !isHeader)) isCommon = true;
				//
				var sameLine = label.y == lastY;
				var isIndented:Bool = sameLine ? null : label.x > commonX;
				
				// new paragraph?
				if (
					(isIndented != null && isIndented && !wasIndented) // indented paragraph!
					|| isHeader != wasHeader // header starts/ends
					|| isCommon != wasCommon && isIndented != null // new block with font change
				) {
					if (out.childNodes.length == 0) out.remove();
					out = document.createElement(isHeader ? "h2" : "p");
					preview.append(out);
				}
				
				//
				var prev = out.childNodes.length > 0 ? out.childNodes[out.childNodes.length - 1] : null;
				var wantSep = prev != null;
				if (wantSep) {
					static var rxPunctuation = new RegExp("^[,.:\"]");
					var prevTag = (cast prev:Element).tagName;
					if ((prevTag == "B" || prevTag == "I") && rxPunctuation.test(text)) {
						wantSep = false;
					}
				}
				if (wantSep) out.append(" ");
				//
				if (isHeader) {
					// ignore formatting in headers
					out.append(text);
				} else if (isBold) {
					var b = document.createElement("b");
					b.append(text);
					out.append(b);
				} else if (isItalic) {
					var i = document.createElement("i");
					i.append(text);
					out.append(i);
				} else {
					out.append(text);
				}
				//
				lastY = label.y;
				wasHeader = isHeader;
				wasCommon = isCommon;
				if (isIndented != null) wasIndented = isIndented;
			}
		}
		
		// add line breaks for readability:
		var previewElements = [for (e in preview.children) e];
		for (i => e in previewElements) if (i > 0) {
			switch (e.tagName) {
				case "H2", "HR":
					e.before("\n\n");
				default:
					e.before("\n");
			}
		}
		
		//
		ctx.restore();
	}
}