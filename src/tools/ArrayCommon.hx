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
		var bestVal:T = null;
		var bestCount = -1;
		for (pair in pairs) {
			var n = pair.arr.length;
			if (n > bestCount) {
				bestCount = n;
				bestVal = pair.value;
			}
		}
		return { value: bestVal, count: bestCount };
	}
	public static function findMostCommon<Q, T>(arr:Array<Q>, getter:Q->T) {
		return findMostCommonEx(arr, (arr, add) -> {
			for (item in arr) {
				add(getter(item));
			}
		});
	}
}