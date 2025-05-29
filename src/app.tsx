import { useState, useEffect, useRef } from 'preact/hooks';
import './app.css';

// Game constants
const GRID_SIZE = 16;
const TILE_SIZE = 25;

interface Position {
	x: number;
	y: number;
}

interface TapAnimation {
	x: number;
	y: number;
	id: number;
}

export function App() {
	const [targetPattern, setTargetPattern] = useState<boolean[][]>([]);
	const [paintedPattern, setPaintedPattern] = useState<number[][]>([]); // Changed to numbers for order tracking
	const [currentStroke, setCurrentStroke] = useState<Position[]>([]);
	const [isDrawing, setIsDrawing] = useState(false);
	const [level, setLevel] = useState(1);
	const [isCompleted, setIsCompleted] = useState(false);
	const [tapAnimations, setTapAnimations] = useState<TapAnimation[]>([]);

	const paintSoundRef = useRef<HTMLAudioElement>();
	const completeSoundRef = useRef<HTMLAudioElement>();
	const gameContainerRef = useRef<HTMLDivElement>(null);

	// Generate irregular shapes with holes
	const generateLevel = (levelNum: number) => {
		const pattern = Array(GRID_SIZE)
			.fill(null)
			.map(() => Array(GRID_SIZE).fill(false));
		const painted = Array(GRID_SIZE)
			.fill(null)
			.map(() => Array(GRID_SIZE).fill(0));

		const centerX = Math.floor(GRID_SIZE / 2);
		const centerY = Math.floor(GRID_SIZE / 2);

		if (levelNum === 1) {
			// Simple irregular rectangle with a hole
			for (let y = 4; y < 12; y++) {
				for (let x = 3; x < 13; x++) {
					pattern[y][x] = true;
				}
			}
			// Create hole in the middle
			for (let y = 7; y < 9; y++) {
				for (let x = 7; x < 9; x++) {
					pattern[y][x] = false;
				}
			}
		} else if (levelNum === 2) {
			// L-shaped pattern with holes
			for (let y = 2; y < 14; y++) {
				for (let x = 2; x < 7; x++) {
					pattern[y][x] = true;
				}
			}
			for (let y = 2; y < 7; y++) {
				for (let x = 7; x < 14; x++) {
					pattern[y][x] = true;
				}
			}
			// Add some holes
			pattern[4][4] = false;
			pattern[5][4] = false;
			pattern[4][10] = false;
			pattern[5][10] = false;
		} else if (levelNum === 3) {
			// Cross shape with irregular edges
			for (let y = 6; y < 10; y++) {
				for (let x = 2; x < 14; x++) {
					pattern[y][x] = true;
				}
			}
			for (let y = 2; y < 14; y++) {
				for (let x = 6; x < 10; x++) {
					pattern[y][x] = true;
				}
			}
			// Make edges irregular
			pattern[6][2] = false;
			pattern[9][2] = false;
			pattern[6][13] = false;
			pattern[9][13] = false;
			pattern[2][6] = false;
			pattern[2][9] = false;
			pattern[13][6] = false;
			pattern[13][9] = false;
			// Add holes
			pattern[7][7] = false;
			pattern[8][8] = false;
		} else {
			// Complex irregular pattern
			for (let y = 0; y < GRID_SIZE; y++) {
				for (let x = 0; x < GRID_SIZE; x++) {
					const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
					if (distance < 7 && distance > 2) {
						pattern[y][x] = true;
					}
				}
			}
			// Make it more irregular and add holes
			for (let i = 0; i < 8; i++) {
				const randX = Math.floor(Math.random() * GRID_SIZE);
				const randY = Math.floor(Math.random() * GRID_SIZE);
				if (pattern[randY] && pattern[randY][randX]) {
					pattern[randY][randX] = false;
				}
			}
		}

		setTargetPattern(pattern);
		setPaintedPattern(painted);
		setCurrentStroke([]);
		setIsCompleted(false);
		setIsDrawing(false);
	};

	// Initialize game
	useEffect(() => {
		generateLevel(level);

		// Create audio objects for sound effects
		paintSoundRef.current = new Audio();
		completeSoundRef.current = new Audio();

		// Generate simple beep sounds using Web Audio API
		const createBeepSound = (frequency: number, duration: number) => {
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);

			oscillator.frequency.value = frequency;
			oscillator.type = 'sine';

			gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

			oscillator.start();
			oscillator.stop(audioContext.currentTime + duration);
		};

		// Override audio play methods with Web Audio API
		if (paintSoundRef.current) {
			paintSoundRef.current.play = () => {
				createBeepSound(400, 0.05);
				return Promise.resolve();
			};
		}

		if (completeSoundRef.current) {
			completeSoundRef.current.play = () => {
				createBeepSound(600, 0.5);
				return Promise.resolve();
			};
		}
	}, [level]);

	// Check if level is completed
	const checkCompletion = (painted: number[][]) => {
		for (let y = 0; y < GRID_SIZE; y++) {
			for (let x = 0; x < GRID_SIZE; x++) {
				if (targetPattern[y][x] && painted[y][x] === 0) {
					return false;
				}
			}
		}
		return true;
	};

	// Check if two positions are adjacent
	const areAdjacent = (pos1: Position, pos2: Position) => {
		const dx = Math.abs(pos1.x - pos2.x);
		const dy = Math.abs(pos1.y - pos2.y);
		return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
	};

	// Handle clicking on a cell
	const handleCellClick = (x: number, y: number) => {
		if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE || !targetPattern[y][x]) {
			return;
		}

		const currentOrder = paintedPattern[y][x];

		// If clicking on an already painted cell, revert to that point
		if (currentOrder > 0) {
			const newStroke = currentStroke.slice(0, currentOrder);
			const newPainted = paintedPattern.map((row) => [...row]);

			// Clear all cells after the clicked position
			for (let sy = 0; sy < GRID_SIZE; sy++) {
				for (let sx = 0; sx < GRID_SIZE; sx++) {
					if (newPainted[sy][sx] > currentOrder) {
						newPainted[sy][sx] = 0;
					}
				}
			}

			setCurrentStroke(newStroke);
			setPaintedPattern(newPainted);
			return;
		}

		// If this is the first cell or adjacent to the last painted cell
		if (
			currentStroke.length === 0 ||
			areAdjacent(currentStroke[currentStroke.length - 1], { x, y })
		) {
			const newStroke = [...currentStroke, { x, y }];
			const newOrder = newStroke.length;

			setPaintedPattern((prev) => {
				const newPattern = prev.map((row) => [...row]);
				newPattern[y][x] = newOrder;

				// Check completion
				setTimeout(() => {
					if (checkCompletion(newPattern)) {
						setIsCompleted(true);
						completeSoundRef.current?.play();
						setTimeout(() => {
							setLevel((prev) => prev + 1);
						}, 2000);
					}
				}, 50);

				return newPattern;
			});

			setCurrentStroke(newStroke);
			paintSoundRef.current?.play();
		}
	};

	// Handle mouse/touch events
	const handlePointerDown = (event: MouseEvent | TouchEvent) => {
		event.preventDefault();
		setIsDrawing(true);

		const rect = gameContainerRef.current?.getBoundingClientRect();
		if (!rect) return;

		let clientX: number, clientY: number;

		if (event.type === 'touchstart') {
			const touch = (event as TouchEvent).touches[0];
			clientX = touch.clientX;
			clientY = touch.clientY;
		} else {
			clientX = (event as MouseEvent).clientX;
			clientY = (event as MouseEvent).clientY;
		}

		const x = Math.floor((clientX - rect.left) / TILE_SIZE);
		const y = Math.floor((clientY - rect.top) / TILE_SIZE);

		handleCellClick(x, y);

		// Add tap animation
		const tapId = Date.now();
		setTapAnimations((prev) => [
			...prev,
			{
				x: clientX - rect.left,
				y: clientY - rect.top,
				id: tapId,
			},
		]);

		setTimeout(() => {
			setTapAnimations((prev) => prev.filter((tap) => tap.id !== tapId));
		}, 300);
	};

	const handlePointerMove = (event: MouseEvent | TouchEvent) => {
		if (!isDrawing) return;

		event.preventDefault();
		const rect = gameContainerRef.current?.getBoundingClientRect();
		if (!rect) return;

		let clientX: number, clientY: number;

		if (event.type === 'touchmove') {
			const touch = (event as TouchEvent).touches[0];
			clientX = touch.clientX;
			clientY = touch.clientY;
		} else {
			clientX = (event as MouseEvent).clientX;
			clientY = (event as MouseEvent).clientY;
		}

		const x = Math.floor((clientX - rect.left) / TILE_SIZE);
		const y = Math.floor((clientY - rect.top) / TILE_SIZE);

		handleCellClick(x, y);
	};

	const handlePointerUp = () => {
		setIsDrawing(false);
	};

	// Add global event listeners for mouse up
	useEffect(() => {
		document.addEventListener('mouseup', handlePointerUp);
		document.addEventListener('touchend', handlePointerUp);

		return () => {
			document.removeEventListener('mouseup', handlePointerUp);
			document.removeEventListener('touchend', handlePointerUp);
		};
	}, []);

	// Reset current level
	const resetLevel = () => {
		generateLevel(level);
	};

	// Get cell style
	const getCellStyle = (x: number, y: number) => {
		const isTarget = targetPattern[y] && targetPattern[y][x];
		const paintOrder = paintedPattern[y] && paintedPattern[y][x];

		if (!isTarget) {
			return 'bg-gray-900'; // Empty space
		}

		if (paintOrder > 0) {
			return `bg-blue-400 shadow-sm shadow-blue-400/50 border border-blue-300`; // Painted
		}

		return 'bg-gray-700 border border-gray-600 hover:bg-gray-600'; // Target to paint
	};

	return (
		<div className='w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden'>
			{/* UI */}
			<div className='text-white text-xl font-bold mb-2'>Level {level}</div>
			{isCompleted && (
				<div className='text-green-400 text-lg font-bold mb-2 animate-pulse'>
					Perfect! One stroke complete!
				</div>
			)}

			<div
				ref={gameContainerRef}
				className='relative bg-gray-800 border-2 border-gray-600 mb-4 select-none'
				style={{
					width: GRID_SIZE * TILE_SIZE,
					height: GRID_SIZE * TILE_SIZE,
				}}
				onMouseDown={handlePointerDown}
				onMouseMove={handlePointerMove}
				onTouchStart={handlePointerDown}
				onTouchMove={handlePointerMove}
			>
				{/* Render grid cells */}
				{Array.from({ length: GRID_SIZE }, (_, y) =>
					Array.from({ length: GRID_SIZE }, (_, x) => (
						<div
							key={`${x}-${y}`}
							className={`absolute transition-all duration-200 ${getCellStyle(x, y)}`}
							style={{
								left: x * TILE_SIZE,
								top: y * TILE_SIZE,
								width: TILE_SIZE,
								height: TILE_SIZE,
							}}
						/>
					))
				)}

				{/* Draw stroke lines */}
				{currentStroke.length > 1 &&
					currentStroke.slice(0, -1).map((pos, index) => {
						const nextPos = currentStroke[index + 1];
						const fromX = pos.x * TILE_SIZE + TILE_SIZE / 2;
						const fromY = pos.y * TILE_SIZE + TILE_SIZE / 2;
						const toX = nextPos.x * TILE_SIZE + TILE_SIZE / 2;
						const toY = nextPos.y * TILE_SIZE + TILE_SIZE / 2;

						const length = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
						const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI);

						return (
							<div
								key={`line-${index}`}
								className='absolute bg-blue-300 pointer-events-none'
								style={{
									left: fromX,
									top: fromY - 1,
									width: length,
									height: 2,
									transformOrigin: '0 50%',
									transform: `rotate(${angle}deg)`,
									zIndex: 10,
								}}
							/>
						);
					})}

				{/* Tap animations */}
				{tapAnimations.map((tap) => (
					<div
						key={tap.id}
						className='absolute pointer-events-none'
						style={{
							left: tap.x - 10,
							top: tap.y - 10,
							zIndex: 20,
						}}
					>
						<div className='w-5 h-5 border-2 border-blue-400 rounded-full animate-ping opacity-75' />
					</div>
				))}
			</div>

			{/* Controls */}
			<div className='flex gap-4 mb-4'>
				<button
					onClick={resetLevel}
					className='px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors'
				>
					Reset
				</button>
			</div>

			{/* Instructions */}
			<div className='text-gray-400 text-sm text-center max-w-md'>
				Draw one continuous line to fill all gray squares. Tap on existing line to revert.
			</div>
		</div>
	);
}
