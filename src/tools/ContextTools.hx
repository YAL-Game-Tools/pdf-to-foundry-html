package tools;

import js.html.CanvasRenderingContext2D;

class ContextTools {
	public static function drawLine(ctx:CanvasRenderingContext2D, x1:Float, y1:Float, x2:Float, y2:Float) {
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.closePath();
		ctx.stroke();
	}
}