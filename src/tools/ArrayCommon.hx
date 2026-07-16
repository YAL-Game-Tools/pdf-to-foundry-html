package tools;

class ArrayCommon {
	public static function findMostCommonEx<Q, T>(
		arr:Array<Q>,
		fn:(arr:Array<Q>, add:(value:T)->Void)->Void
	) {
		var map = new js.lib.Map();
		var pairs = [];
		function add(value:T) {
			var arr = map.get(value);
			if (arr == null) {
				arr = [value];
				map.set(value, arr);
				pairs.push(osh([ value, arr ]));
			} else arr.push(value);
		}
		fn(arr, add);
		pairs.sort((a, b) -> b.arr.length - a.arr.length);
		var best = pairs[0];
		return {
			value: best?.value,
			count: best != null ? best.arr.length : -1,
			pairs: pairs,
		};
	}
	public static function findMostCommon<Q, T>(arr:Array<Q>, getter:Q->T) {
		return findMostCommonEx(arr, (arr, add) -> {
			for (item in arr) {
				add(getter(item));
			}
		});
	}
}