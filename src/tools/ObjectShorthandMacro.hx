package tools;

import haxe.macro.Context;
import haxe.macro.Expr;

class ObjectShorthandMacro {
	public static macro function osh(identArray:Expr, ?namedFields:Expr) {
		var identifiers = switch (identArray.expr) {
			case EArrayDecl(values): values;
			default: Context.error("Expected [field1, field2]", identArray.pos); [];
		}
		//
		var objFields = [];
		for (ident in identifiers) switch (ident.expr) {
			case EConst(CIdent(name)):
				objFields.push({
					field: name,
					expr: ident,
				});
			case EField(e, field, kind):
				objFields.push({
					field: field,
					expr: ident,
				});
			default:
				Context.error("Expected an identifier", ident.pos);
		}
		//
		if (namedFields != null) switch (namedFields.expr) {
			case EConst(CIdent("null")): {};
			case EBlock([]): {};
			case EObjectDecl(extraFields): objFields = objFields.concat(extraFields);
			default: Context.error("Expected an object literal, got " + namedFields.expr, namedFields.pos);
		}
		return { expr: EObjectDecl(objFields), pos: Context.currentPos() };
	}
}