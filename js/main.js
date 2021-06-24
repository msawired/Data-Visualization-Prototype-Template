let app = {
	'showCash': true,
	'secs': [],
	'numbers': {
		'total': 0,
		'profit': 0,
		'Cash':0,
		'ASAN': 0,
		'PTON': 0
	}
}
let data;
let series;

$(function () {


	d3.csv('https://docs.google.com/spreadsheets/d/e/2PACX-1vRDtY-_v6tfISmRpSDMpZafMLmQnRySFkJhKuQ8OSJPKLKcrEwGdhIaZUN5DuTdgZDBb0Vv6M9ibsQy/pub?gid=0&single=true&output=csv', function (d,i) {
		//prep rows
		d['date'] = new Date(d['date']);
		d['index'] = i;
		//numerize all columns
		d['ASAN-paidAdjusted'] = Number(d['ASAN-paidAdjusted'].replace(/[^0-9.-]+/g, ""));
		d['ASAN-profitAdjusted'] = Number(d['ASAN-profitAdjusted'].replace(/[^0-9.-]+/g, ""));
		d['PTON-paidAdjusted'] = Number(d['PTON-paidAdjusted'].replace(/[^0-9.-]+/g, ""));
		d['PTON-profitAdjusted'] = Number(d['PTON-profitAdjusted'].replace(/[^0-9.-]+/g, ""));
		d['Cash-total'] = Number(d['Cash-total'].replace(/[^0-9.-]+/g, ""));
		return d;
	}).then(function (data) {
		console.log(data);
		//prep data
		//pull securities
		/* app.secs = data.columns
			.filter(d => d.includes('-total'))
			.map(function (d) {
				return {
					'name': d.substring(0, d.length - 7),
					'colName': d,
					'show': true,
				}
			}); */

		app.secs = [
			{
				'name': 'ASAN',
				'colName': 'ASAN-total',
				'show': true,
			},
			{
				'name': 'PTON',
				'colName': 'PTON-total',
				'show': true,
			},
			{
				'name': 'Cash',
				'colName': 'Cash-total',
				'show': true,
				'color': '#D8D8D899'
			}
		];
		//add colors
		app.secs.forEach((s, i) => s.color = s.color ? s.color : d3.schemeSet3[i]);

		window.data = data;
		// setup stack
		initChart();
		updateChart();
		initUI();
	})
})


var initUI = function () {
	new Vue({
		el: '#controls',
		data: function () {
			return {
				app: app

			}
		},
		methods: {
			'updateChart': function () {
				window.updateChart();
			}
		}
	})

}

let svg;
var margin = { top: 20, right: 20, bottom: 50, left: 40 };
let height = 500 - margin.top - margin.bottom;
let width;
let x, y;
var initChart = function (series) {
	svg = d3.select("svg#chart").append('g');
	svg.append('g').attr('class', 'paths');
	svg.append('g').attr('class', 'lines');
	svg.append('g').attr('class', 'markers');
	svg.append('g').attr('class', 'cursor');
}
var updateChart = function () {
	let secsToDraw = app.secs.filter(d => d.show);
	// let cols = secsToDraw.map(d => d.colName);
	let cols = ['ASAN-paidAdjusted', 'ASAN-profitAdjusted', 'PTON-paidAdjusted', 'PTON-profitAdjusted', 'Cash-total'];
	series = d3.stack()
		.keys(cols)(window.data);
	console.log(series);

	let patternBG = series.filter(d => d.key.includes('paidAdjusted'));
	patternBG.forEach(function (d) {
		let shallowCopy = [...d];
		shallowCopy.type = 'bg';
		shallowCopy.key = d.key + 'bg';
		shallowCopy.index = d.index;
		series.push(shallowCopy);
	});
	console.log(series);
	series.sort(function (a, b) {
		if (a.type == 'bg' && b.type != 'bg') {
			return -1
		}
		if (a.type != 'bg' && b.type == 'bg') {
			return 1
		}
		return 0;
	});



	// let seriesToDraw = series.filter(d => secsToDraw.some(sec => sec.colName == d.key));
	let seriesToDraw = series;

	width = $('svg#chart').width() - margin.left - margin.right;
	svg.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


	let portfolioMax = d3.max(window.data.map(d => getNumber(d['portfolio-total'])));
	let padding = portfolioMax * 0.1; //$ padding

	y = d3.scaleLinear([0, portfolioMax + padding], [height, 0]);
	x = d3.scaleLinear([0, series[0].length], [0, width]);
	let area = d3.area()
		.x((d, i) => x(i))
		.y0(d => y(d[0]))
		.y1(d => y(d[1]))



	svg.select('g.paths').selectAll("path.sec")
		.data(seriesToDraw, d => d.key)
		.join(
			function (enter) {
				return enter
					.append('path')
					.attr("class", d => 'path-' + d.key)
					.classed("sec", true)
					.classed("capital", d => d.key.includes('paidAdjusted'))
					.attr("d", area)
					.attr("fill", function (d, i) {
						return d.type ? '#999' : getSecByCol(d.key).color;
					})
					.attr("mask", d => d.type != 'bg' && d.key.includes('paidAdjusted') ? 'url(#pattern-mask)' : null)
					.on('click', function (e, d) {
						console.log(d.key);
					})
			},
			function (update) {
				return update
					.attr("d", area)
			},
			function (exit) {
				return exit
					.remove()
			})
		;



	updatePortfolioBase();
	updateMarkers();
	updateCursor();

	// Add the y Axis
	svg.append("g")
		.call(d3.axisLeft(y));


}
function updatePortfolioBase() {
	let portfolioBase = window.data.map(d => getNumber(d['portfolio-base']));

	//draw portfolio base
	let line = d3.line()
		.x((d, i) => x(i))
		.y(d => y(d));


	svg.select("g.lines").selectAll("path.portfolioBase")
		.data([portfolioBase])
		.join(function (enter) {
			enter.append("path")
				.classed("portfolioBase", 1)
				.attr("fill", "none")
				.attr("stroke", "steelblue")
				.attr("stroke-width", 1)
				.attr("d", line);
		})

}

function updateCursor() {
	let cursor = svg.select('g.cursor').append('line')
		.classed('cursorLine', 1)
		.attr('x1', x.range()[0])
		.attr('x2', x.range()[0])
		.attr('y1', y.range()[0])
		.attr('y2', y.range()[1]);
	svg
		.on('mouseenter', function () {
			cursor.classed('show', 1);
		})
		.on('mousemove', function (e) {
			let coords = d3.pointer(e, this);
			cursor
				.attr('x1', coords[0])
				.attr('x2', coords[0])
			updateNumbers(Math.floor(x.invert(coords[0])));
		})
		.on('mouseleave', function () {
			cursor.classed('show', 0);
		})
}

function updateNumbers(index){
	console.log(index);
	app.numbers['Cash'] = window.data[index]['Cash-total'];
	app.numbers['ASAN'] = window.data[index]['ASAN-total'];
	app.numbers['PTON'] = window.data[index]['PTON-total'];
	

}

function updateMarkers() {
	// let cols = ['ASAN-new', 'ASAN-transPrice', 'PTON-new', 'PTON-transPrice', 'Cash-new'];
	let cols = ['ASAN-new', 'ASAN-transPrice'];
	let markers = window.data
		.filter(d => d[cols[0]] != "")
		.map((d, i) => {
			return {
				'date': d.date,
				'index': d.index,
				'type': d[cols[0]] > 0 ? 'buy' : 'sell',
				'amount': Math.abs(d[cols[0]]),
				'price': Math.abs(d[cols[1]]),
				'total': Math.abs(d[cols[1]]) * Math.abs(d[cols[0]])
			}
		});

	svg.select("g.markers").selectAll("circle")
		.data(markers)
		.join(function (enter) {
			enter.append("circle")
				.classed("marker", 1)
				.attr("fill", "black")
				.attr("cx", d => x(d.index))
				.attr("cy", height)
				.attr("r", "5")
		})

}

function getSecByCol(colName) {
	let secName = colName.split('-')[0];
	console.log(colName, secName);
	return app.secs.find(d => d.name == secName);
}
function getNumber(currency) {
	return Number(currency.replace(/[^0-9.-]+/g, ""))
}