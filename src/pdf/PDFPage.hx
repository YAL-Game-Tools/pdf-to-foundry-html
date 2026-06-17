package pdf;

extern class PDFPage {
	private var view:Array<Float>;
	public var width(get, never):Float;
	inline function get_width():Float {
		return view[2];
	}
	public var height(get, never):Float;
	inline function get_height():Float {
		return view[3];
	}
	public var commonObjs:PDFObjects;
}
extern class PDFObjects {
	public function get(name:String):Any;
	public inline function getFont(name:String):PDFFontFace {
		return get(name);
	}
}
extern class PDFFontFace {
	public var black:Null<Bool>;
	public var bold:Null<Bool>;
	public var italic:Null<Bool>;
	public var name:String;
}