import svelte from 'svelte';
import Subdivide from '../..';
import { assert, test, done } from 'tape-modern';

// setup
const target = document.querySelector('main');

function indent(node, spaces) {
	if (node.childNodes.length === 0) return;

	if (node.childNodes.length > 1 || node.childNodes[0].nodeType !== 3) {
		const first = node.childNodes[0];
		const last = node.childNodes[node.childNodes.length - 1];

		const head = `\n${spaces}  `;
		const tail = `\n${spaces}`;

		if (first.nodeType === 3) {
			first.data = `${head}${first.data}`;
		} else {
			node.insertBefore(document.createTextNode(head), first);
		}

		if (last.nodeType === 3) {
			last.data = `${last.data}${tail}`;
		} else {
			node.appendChild(document.createTextNode(tail));
		}

		let lastType = null;
		for (let i = 0; i < node.childNodes.length; i += 1) {
			const child = node.childNodes[i];
			if (child.nodeType === 1) {
				indent(node.childNodes[i], `${spaces}  `);

				if (lastType === 1) {
					node.insertBefore(document.createTextNode(head), child);
					i += 1;
				}
			}

			lastType = child.nodeType;
		}
	}
}

function normalize(html) {
	const div = document.createElement('div');
	div.innerHTML = html
		.replace(/<!--.*?-->/g, '')
		.replace(/svelte-ref-\w+=""/g, '')
		.replace(/\s*svelte-\w+\s*/g, '')
		.replace(/class=""/g, '')
		.replace(/>\s+/g, '>')
		.replace(/\s+</g, '<');

	indent(div, '');

	div.normalize();
	return div.innerHTML;
}

assert.htmlEqual = (a, b, msg) => {
	assert.equal(normalize(a), normalize(b));
};

function mousedown(node, clientX, clientY, metaKey) {
	node.dispatchEvent(new MouseEvent('mousedown', {
		metaKey,
		clientX,
		clientY
	}));
}

function mousemove(node, clientX, clientY) {
	node.dispatchEvent(new MouseEvent('mousemove', {
		clientX,
		clientY
	}));
}

function mouseup(node, clientX, clientY) {
	node.dispatchEvent(new MouseEvent('mouseup', {
		clientX,
		clientY
	}));
}

function init(layout) {
	const Item = svelte.create(`
		<span>{index}</span>

		<script>
			let index = 0;

			export default {
				data() {
					return {
						index: index++
					};
				}
			};
		</script>
	`);

	return new Subdivide({
		target,
		data: {
			component: Item,
			thickness: '0px',
			layout
		}
	});
}

// tests
test('creates a single pane element that fills the target', t => {
	const layout = init();

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 0%; top: 0%; width: 100%; height: 100%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>
			</div>
		</div>
	`);

	layout.destroy();
});

test('creates a new pane', t => {
	const layout = init();

	const { container } = layout.refs;
	const pane = document.querySelector('.pane');

	mousedown(pane, 5, 100, true);
	mouseup(document.querySelector('.overlay'), 200, 100);

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 20%; top: 0%; width: 80%; height: 100%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>

				<div class="pane" style="left: 0%; top: 0%; width: 20%; height: 100%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>

				<div class="vertical divider" style="top: 0%; left: 20%; height: 100%;"></div>
			</div>
		</div>
	`);

	layout.destroy();
});

test('preserves correct pane/divider relationships (a)', t => {
	const layout = init();
	const { container } = layout.refs;

	const { left, top, right, bottom } = container.getBoundingClientRect();
	const width = right - left;
	const height = bottom - top;
	const cx = left + width / 2;
	const cy = top + height / 2;

	let pane = document.querySelector('.pane');

	// split from the left edge
	mousedown(pane, 5, 100, true);
	mouseup(document.querySelector('.overlay'), 200, 100);

	// split from the right edge
	mousedown(pane, 995, 100, true);
	mouseup(document.querySelector('.overlay'), 800, 100);

	// split from the top middle
	mousedown(pane, 500, 5, true);
	mouseup(document.querySelector('.overlay'), 500, 500);

	// split the lower middle chunk from the left
	mousedown(pane, 205, 750, true);
	mouseup(document.querySelector('.overlay'), 500, 750);

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 50%; top: 50%; width: 30%; height: 50%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>

				<div class="pane" style="left: 0%; top: 0%; width: 20%; height: 100%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>

				<div class="pane" style="left: 80%; top: 0%; width: 20%; height: 100%; cursor: default;">
					<div class="inner">
						<span>2</span>
					</div>
				</div>

				<div class="pane" style="left: 20%; top: 0%; width: 60%; height: 50%; cursor: default;">
					<div class="inner">
						<span>3</span>
					</div>
				</div>

				<div class="pane" style="left: 20%; top: 50%; width: 30%; height: 50%; cursor: default;">
					<div class="inner">
						<span>4</span>
					</div>
				</div>

				<div class="vertical divider" style="top: 0%; left: 20%; height: 100%;"></div>
				<div class="vertical divider" style="top: 0%; left: 80%; height: 100%;"></div>
				<div class="horizontal divider" style="left: 20%; top: 50%; width: 60%;"></div>
				<div class="vertical divider" style="top: 50%; left: 50%; height: 50%;"></div>
			</div>
		</div>
	`);

	// now, check that dragging the leftmost vertical slider updates the
	// layout how we expect
	let divider = target.querySelectorAll('.divider')[0];
	mousedown(divider, 200, 500);
	mouseup(document.querySelector('.overlay'), 100, 500);

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 45%; top: 50%; width: 35%; height: 50%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>

				<div class="pane" style="left: 0%; top: 0%; width: 10%; height: 100%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>

				<div class="pane" style="left: 80%; top: 0%; width: 20%; height: 100%; cursor: default;">
					<div class="inner">
						<span>2</span>
					</div>
				</div>

				<div class="pane" style="left: 10%; top: 0%; width: 70%; height: 50%; cursor: default;">
					<div class="inner">
						<span>3</span>
					</div>
				</div>

				<div class="pane" style="left: 10%; top: 50%; width: 35%; height: 50%; cursor: default;">
					<div class="inner">
						<span>4</span>
					</div>
				</div>

				<div class="vertical divider" style="top: 0%; left: 10%; height: 100%;"></div>
				<div class="vertical divider" style="top: 0%; left: 80%; height: 100%;"></div>
				<div class="horizontal divider" style="left: 10%; top: 50%; width: 70%;"></div>
				<div class="vertical divider" style="top: 50%; left: 45%; height: 50%;"></div>
			</div>
		</div>
	`);

	// split the top middle pane
	pane = target.querySelectorAll('.pane')[3];
	mousedown(pane, 105, 250, true);
	mouseup(document.querySelector('.overlay'), 500, 250);

	// drag the rightmost vertical divider
	divider = target.querySelectorAll('.divider')[1];
	mousedown(divider, 800, 500);
	mouseup(document.querySelector('.overlay'), 900, 500);

	// TODO tweak the numbers so we get nice round (testable) numbers
	// t.htmlEqual(target.innerHTML, `
	// 	<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
	// 		<div class="pane" style="left: 50%; top: 50%; width: 40%; height: 50%; cursor: default;">
	// 			<div class="inner">
	// 				<span>0</span>
	// 			</div>
	// 		</div>

	// 		<div class="pane" style="left: 0%; top: 0%; width: 10%; height: 100%; cursor: default;">
	// 			<div class="inner">
	// 				<span>1</span>
	// 			</div>
	// 		</div>

	// 		<div class="pane" style="left: 90%; top: 0%; width: 10%; height: 100%; cursor: default;">
	// 			<div class="inner">
	// 				<span>2</span>
	// 			</div>
	// 		</div>

	// 		<div class="pane" style="left: 55%; top: 0%; width: 35%; height: 50%; cursor: default;">
	// 			<div class="inner">
	// 				<span>3</span>
	// 			</div>
	// 		</div>

	// 		<div class="pane" style="left: 10%; top: 50%; width: 40%; height: 50%; cursor: default;">
	// 			<div class="inner">
	// 				<span>4</span>
	// 			</div>
	// 		</div>

	// 		<div class="pane" style="left: 10%; top: 0%; width: 45%; height: 50%; cursor: default;">
	// 			<div class="inner">
	// 				<span>5</span>
	// 			</div>
	// 		</div>

	// 		<div class="divider" style="top: 0%; left: 10%; height: 100%;"></div>

	// 		<div class="divider" style="top: 0%; left: 90%; height: 100%;"></div>

	// 		<div class="divider" style="left: 10%; top: 50%; width: 80%;"></div>

	// 		<div class="divider" style="top: 50%; left: 50%; height: 50%;"></div>

	// 		<div class="divider" style="top: 0%; left: 55%; height: 50%;"></div>
	// 	</div>
	// `);

	layout.destroy();
});

test('preserves correct pane/divider relationships (b)', t => {
	const layout = init();
	const { container } = layout.refs;

	const { left, top, right, bottom } = container.getBoundingClientRect();
	const width = right - left;
	const height = bottom - top;
	const cx = left + width / 2;
	const cy = top + height / 2;

	let pane = document.querySelector('.pane');

	// split from the left edge
	mousedown(pane, 5, 100, true);
	mouseup(document.querySelector('.overlay'), 700, 100);

	// split from the new split
	pane = target.querySelectorAll('.pane')[1];
	mousedown(pane, 695, 100, true);
	mouseup(document.querySelector('.overlay'), 300, 100);

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 70%; top: 0%; width: 30%; height: 100%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>

				<div class="pane" style="left: 0%; top: 0%; width: 30%; height: 100%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>

				<div class="pane" style="left: 30%; top: 0%; width: 40%; height: 100%; cursor: default;">
					<div class="inner">
						<span>2</span>
					</div>
				</div>

				<div class="vertical divider" style="top: 0%; left: 70%; height: 100%;"></div>
				<div class="vertical divider" style="top: 0%; left: 30%; height: 100%;"></div>
			</div>
		</div>
	`);

	// now, check that dragging the leftmost vertical slider updates the
	// layout how we expect
	let divider = target.querySelectorAll('.divider')[0];
	mousedown(divider, 700, 500);
	mouseup(document.querySelector('.overlay'), 500, 500);

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 50%; top: 0%; width: 50%; height: 100%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>

				<div class="pane" style="left: 0%; top: 0%; width: 30%; height: 100%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>

				<div class="pane" style="left: 30%; top: 0%; width: 20%; height: 100%; cursor: default;">
					<div class="inner">
						<span>2</span>
					</div>
				</div>

				<div class="vertical divider" style="top: 0%; left: 50%; height: 100%;"></div>
				<div class="vertical divider" style="top: 0%; left: 30%; height: 100%;"></div>
			</div>
		</div>
	`);

	layout.destroy();
});

test('preserves correct pane/divider relationships (c)', t => {
	const layout = init();

	let pane = document.querySelector('.pane');

	// split from the left edge
	mousedown(pane, 5, 100, true);
	mouseup(document.querySelector('.overlay'), 250, 100);

	// split from the new split
	pane = target.querySelectorAll('.pane')[0];
	mousedown(pane, 255, 100, true);
	mouseup(document.querySelector('.overlay'), 500, 100);

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 50%; top: 0%; width: 50%; height: 100%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>

				<div class="pane" style="left: 0%; top: 0%; width: 25%; height: 100%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>

				<div class="pane" style="left: 25%; top: 0%; width: 25%; height: 100%; cursor: default;">
					<div class="inner">
						<span>2</span>
					</div>
				</div>

				<div class="vertical divider" style="top: 0%; left: 25%; height: 100%;"></div>
				<div class="vertical divider" style="top: 0%; left: 50%; height: 100%;"></div>
			</div>
		</div>
	`);

	// now, check that dragging the leftmost vertical slider updates the
	// layout how we expect
	let divider = target.querySelectorAll('.divider')[0];
	mousedown(divider, 250, 500);
	mouseup(document.querySelector('.overlay'), 350, 500);

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 50%; top: 0%; width: 50%; height: 100%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>

				<div class="pane" style="left: 0%; top: 0%; width: 35%; height: 100%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>

				<div class="pane" style="left: 35%; top: 0%; width: 15%; height: 100%; cursor: default;">
					<div class="inner">
						<span>2</span>
					</div>
				</div>

				<div class="vertical divider" style="top: 0%; left: 35%; height: 100%;"></div>
				<div class="vertical divider" style="top: 0%; left: 50%; height: 100%;"></div>
			</div>
		</div>
	`);

	layout.destroy();
});

test('destroys panes', t => {
	const layout = init();

	const { container } = layout.refs;
	const pane = document.querySelector('.pane');

	mousedown(pane, 5, 100, true);
	mouseup(document.querySelector('.overlay'), 200, 100);

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 20%; top: 0%; width: 80%; height: 100%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>

				<div class="pane" style="left: 0%; top: 0%; width: 20%; height: 100%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>

				<div class="vertical divider" style="top: 0%; left: 20%; height: 100%;"></div>
			</div>
		</div>
	`);

	let divider = target.querySelector('.divider');

	mousedown(divider, 200, 500);
	mouseup(document.querySelector('.overlay'), 1001, 500);

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 0%; top: 0%; width: 100%; height: 100%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>
			</div>
		</div>
	`);

	layout.destroy();
});

test('accepts a layout', t => {
	const layout = init({
		root: {
			id: 0,
			type: 'group',
			row: false,
			pos: 0,
			size: 1,
			prev: null,
			next: null,
			children: [
				{
					type: 'pane',
					id: 1,
					pos: 0,
					size: 0.5,
					prev: null,
					next: null
				},
				{
					type: 'pane',
					id: 2,
					pos: 0.5,
					size: 0.5,
					prev: null,
					next: null
				}
			]
		}
	});

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 0%; top: 0%; width: 100%; height: 50%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>

				<div class="pane" style="left: 0%; top: 50%; width: 100%; height: 50%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>

				<div class="horizontal divider" style="left: 0%; top: 50%; width: 100%;"></div>
			</div>
		</div>
	`);

	layout.destroy();
});

test('fires open/close/layout events', t => {
	const layout = init();

	const events = {
		open: [],
		close: [],
		layout: []
	};

	Object.keys(events).forEach(name => {
		layout.on(name, event => {
			events[name].push(event);
		});
	});

	const pane = document.querySelector('.pane');

	mousedown(pane, 5, 100, true);
	mouseup(document.querySelector('.overlay'), 200, 100);

	t.equal(events.open.length, 1);
	const open = events.open[0];
	t.ok('pane' in open);
	t.ok('layout' in open);
	t.ok('id' in open.pane);

	t.equal(events.layout.length, 2);
	const layout0 = events.layout[0];
	t.equal(JSON.stringify(open.layout), JSON.stringify(layout0.layout));

	t.htmlEqual(target.innerHTML, `
		<div class="clip">
			<div class="layout" style="--thickness:0px; --draggable:calc(0px + 6px); --color:white;">
				<div class="pane" style="left: 20%; top: 0%; width: 80%; height: 100%; cursor: default;">
					<div class="inner">
						<span>0</span>
					</div>
				</div>

				<div class="pane" style="left: 0%; top: 0%; width: 20%; height: 100%; cursor: default;">
					<div class="inner">
						<span>1</span>
					</div>
				</div>

				<div class="vertical divider" style="top: 0%; left: 20%; height: 100%;"></div>
			</div>
		</div>
	`);

	const divider = document.querySelector('.divider');

	mousedown(divider, 200, 100);
	mouseup(document.querySelector('.overlay'), 0, 100);

	t.equal(events.close.length, 1);
	const close = events.close[0];
	t.ok('pane' in close);
	t.ok('layout' in close);
	t.ok('id' in close.pane);

	t.equal(events.layout.length, 3);
	const layout2 = events.layout[2];
	t.equal(JSON.stringify(close.layout), JSON.stringify(layout2.layout));

	layout.destroy();
});

// TODO save to localStorage

// this allows us to close puppeteer once tests have completed
window.done = done;