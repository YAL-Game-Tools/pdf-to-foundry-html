package tools;

import js.html.Node;
import js.lib.RegExp;
import js.Browser.document;

class FoundryHelper {
	static var rsWord = "\\S+";
	static var rsSpace = "\\s+";
	static var rxSkillCheck = (() -> {
		var word = "\\S+";
		var space = "\\s+";
		var skills = [
			"Acrobatics",
			"Arcana",
			"Athletics",
			"Crafting",
			"Deception",
			"Diplomacy",
			"Intimidation",
			'(?:$word(?:$space$word)*?)${space}Lore', // [Cool][ Lore] / [The[ Coolest]][ Lore]
			"Medicine",
			"Nature",
			"Occultism",
			"Perception",
			"Performance",
			"Religion",
			"Society",
			"Stealth",
			"Survival",
			"Thievery"
		];
		var skillsOpt = skills.join("|");
		return new RegExp('DC$space(\\d+)$space($skillsOpt)', "g");
	})();
	static var rxSavingThrow = new RegExp("DC"
		+ "\\s+(\\d+)"
		+ "(\\s+[Bb]asic)?"
		+ "\\s+(Fortitude|Reflex|Will)"
		+ "(?:\\s+[Ss]ave)?"
	, "g");
	static var rxActions = new RegExp("\\[(" + [
		"one-action",
		"two-actions",
		"three-actions",
		"free-action",
		"reaction",
	].join("|") + ")]", "g");
	public static function convertForFoundry(text:String) {
		text = (cast text).replace(rxSkillCheck, (mt:String, dc:String, skill:String) -> {
			var parts = [skill, 'dc:$dc'];
			return '@Check[' + parts.join("|") + ']';
		});
		text = (cast text).replace(rxSavingThrow, (mt:String, dc:String, basic:String, kind:String) -> {
			var parts = [kind, 'dc:$dc'];
			if (basic != null) parts.push("basic");
			return '@Check[' + parts.join("|") + ']';
		});
		//
		var nodes:Array<Node> = [];
		rxActions.lastIndex = 0;
		var start = 0;
		var mt = rxActions.exec(text);
		while (mt != null) {
			if (mt.index > start) {
				nodes.push(document.createTextNode(text.substring(start, mt.index)));
			}
			var glyph = switch (mt[1]) {
				case "one-action": "1";
				case "two-actions": "2";
				case "three-actions": "3";
				case "free-action": "f";
				case "reaction": "r";
				default: "?";
			}
			//
			var glyphSpan = document.createSpanElement();
			glyphSpan.className = "action-glyph";
			glyphSpan.append(glyph);
			nodes.push(glyphSpan);
			//
			start = mt.index + mt[0].length;
			mt = rxActions.exec(text);
		}
		if (start < text.length) {
			nodes.push(document.createTextNode(text.substring(start)));
		}
		//
		return nodes;
	}
}