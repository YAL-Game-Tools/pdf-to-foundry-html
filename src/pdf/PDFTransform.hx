package pdf;

abstract PDFTransform(Array<Float>) {
	public var tx(get, never):Float;
	inline function get_tx():Float {
		return this[4];
	}
	
	public var ty(get, never):Float;
	inline function get_ty():Float {
		return this[5];
	}
}