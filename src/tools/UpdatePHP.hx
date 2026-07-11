package tools;

import haxe.io.Path;
import haxe.macro.Context;
import haxe.macro.Compiler;
#if (sys || macro)
import sys.io.File;
#end

class UpdatePHP {
	public static macro function run():Void {
		Context.onAfterGenerate(() -> {
			var now = Date.now();
			var nowStr = DateTools.format(Date.now(), "%F-%H");
			var dir = Path.directory(Compiler.getOutput());
			var html = File.getContent(dir + "/index.html");
			html = ~/\bAUTO_DATE\b/g.replace(html, nowStr);
			File.saveContent(dir + "/index.php", html);
		});
	}
}