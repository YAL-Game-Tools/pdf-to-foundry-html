package pdf;

import haxe.DynamicAccess;

extern class PDFTextContent {
	var items:Array<PDFLabel>;
	var styles:DynamicAccess<{fontFamily:String}>;
}