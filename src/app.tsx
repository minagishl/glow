import { useState, useEffect, useRef } from 'preact/hooks';
import { Circle, Star } from 'lucide-react';
import './app.css';
import {
	cellVariants,
	buttonVariants,
	strokeLineVariants,
	tapAnimationVariants,
	textVariants,
	layoutVariants,
} from './styles/variants';

// Game constants
const GRID_SIZE = 8;
const TILE_SIZE = 40;
const TILE_GAP = 6;

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
	const [paintedPattern, setPaintedPattern] = useState<number[][]>([]);
	const [currentStroke, setCurrentStroke] = useState<Position[]>([]);
	const [startingPoint, setStartingPoint] = useState<Position | null>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [level, setLevel] = useState(1);
	const [isCompleted, setIsCompleted] = useState(false);
	const [tapAnimations, setTapAnimations] = useState<TapAnimation[]>([]);

	const paintSoundRef = useRef<HTMLAudioElement>();
	const completeSoundRef = useRef<HTMLAudioElement>();
	const gameContainerRef = useRef<HTMLDivElement>(null);

	// Generate irregular shapes with holes and starting points
	const generateLevel = (levelNum: number) => {
		const pattern = Array(GRID_SIZE)
			.fill(null)
			.map(() => Array(GRID_SIZE).fill(false));
		const painted = Array(GRID_SIZE)
			.fill(null)
			.map(() => Array(GRID_SIZE).fill(0));

		let startPoint: Position = { x: 0, y: 0 };

		if (levelNum === 1) {
			// Simple L-shape
			for (let y = 1; y < 6; y++) {
				pattern[y][1] = true;
			}
			for (let x = 1; x < 6; x++) {
				pattern[5][x] = true;
			}
			startPoint = { x: 1, y: 1 };
		} else if (levelNum === 2) {
			// Rectangle with hole in middle
			for (let y = 1; y < 7; y++) {
				for (let x = 1; x < 7; x++) {
					pattern[y][x] = true;
				}
			}
			// Create hole
			pattern[3][3] = false;
			pattern[3][4] = false;
			pattern[4][3] = false;
			pattern[4][4] = false;
			startPoint = { x: 1, y: 1 };
		} else if (levelNum === 3) {
			// Cross shape
			for (let y = 1; y < 7; y++) {
				pattern[y][3] = true;
				pattern[y][4] = true;
			}
			for (let x = 1; x < 7; x++) {
				pattern[3][x] = true;
				pattern[4][x] = true;
			}
			startPoint = { x: 3, y: 1 };
		} else if (levelNum === 4) {
			// Zigzag pattern
			for (let x = 1; x < 7; x++) {
				pattern[1][x] = true;
				pattern[3][x] = true;
				pattern[5][x] = true;
			}
			for (let y = 1; y < 6; y++) {
				pattern[y][1] = true;
				pattern[y][6] = true;
			}
			startPoint = { x: 1, y: 1 };
		} else {
			// Complex spiral-like pattern
			const center = Math.floor(GRID_SIZE / 2);
			for (let y = 1; y < 7; y++) {
				for (let x = 1; x < 7; x++) {
					const distance = Math.abs(x - center) + Math.abs(y - center);
					if (distance >= 1 && distance <= 3) {
						pattern[y][x] = true;
					}
				}
			}
			// Remove some blocks to create interesting shape
			pattern[2][2] = false;
			pattern[5][5] = false;
			startPoint = { x: 1, y: center };
		}

		setTargetPattern(pattern);
		setPaintedPattern(painted);
		setStartingPoint(startPoint);
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

		// Check if this is a valid move
		const isValidMove =
			currentStroke.length === 0
				? startingPoint && x === startingPoint.x && y === startingPoint.y // First click must be on starting point
				: areAdjacent(currentStroke[currentStroke.length - 1], { x, y }); // Subsequent clicks must be adjacent

		if (isValidMove) {
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
		if (isCompleted) return;

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

		const x = Math.floor((clientX - rect.left - 16) / (TILE_SIZE + TILE_GAP));
		const y = Math.floor((clientY - rect.top - 16) / (TILE_SIZE + TILE_GAP));

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
		if (!isDrawing || isCompleted) return;

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

		const x = Math.floor((clientX - rect.left - 16) / (TILE_SIZE + TILE_GAP));
		const y = Math.floor((clientY - rect.top - 16) / (TILE_SIZE + TILE_GAP));

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
	const getCellType = (x: number, y: number) => {
		const isTarget = targetPattern[y] && targetPattern[y][x];
		const paintOrder = paintedPattern[y] && paintedPattern[y][x];
		const isStart =
			startingPoint && x === startingPoint.x && y === startingPoint.y && paintOrder === 0;

		if (!isTarget) {
			return 'empty';
		}

		if (paintOrder > 0) {
			return 'painted';
		}

		if (isStart) {
			return 'start';
		}

		return 'target';
	};

	return (
		<div className={layoutVariants({ type: 'mainWrapper' })}>
			{/* UI */}
			<div className={`${textVariants({ variant: 'title' })} mb-4`}>Level {level}</div>
			{isCompleted && (
				<div className={`${textVariants({ variant: 'subtitle' })} mb-4`}>
					🎉 Perfect! One stroke complete! 🎉
				</div>
			)}

			<div
				ref={gameContainerRef}
				className='relative rounded-2xl p-4 mb-6 select-none'
				style={{
					width: GRID_SIZE * (TILE_SIZE + TILE_GAP) - TILE_GAP + 32,
					height: GRID_SIZE * (TILE_SIZE + TILE_GAP) - TILE_GAP + 32,
				}}
				onMouseDown={handlePointerDown}
				onMouseMove={handlePointerMove}
				onTouchStart={handlePointerDown}
				onTouchMove={handlePointerMove}
			>
				{/* Render grid cells */}
				{Array.from({ length: GRID_SIZE }, (_, y) =>
					Array.from({ length: GRID_SIZE }, (_, x) => {
						const isTarget = targetPattern[y] && targetPattern[y][x];
						if (!isTarget) return null;

						return (
							<div
								key={`${x}-${y}`}
								className={cellVariants({ type: getCellType(x, y) })}
								style={{
									left: x * (TILE_SIZE + TILE_GAP) + 16,
									top: y * (TILE_SIZE + TILE_GAP) + 16,
									width: TILE_SIZE,
									height: TILE_SIZE,
								}}
							/>
						);
					})
				)}

				{/* Starting point indicator */}
				{startingPoint && paintedPattern[startingPoint.y][startingPoint.x] === 0 && (
					<div
						className='absolute flex items-center justify-center'
						style={{
							left: startingPoint.x * (TILE_SIZE + TILE_GAP) + 16,
							top: startingPoint.y * (TILE_SIZE + TILE_GAP) + 16,
							width: TILE_SIZE,
							height: TILE_SIZE,
							zIndex: 15,
						}}
					>
						<Circle size={24} className='text-white fill-white' />
					</div>
				)}

				{/* Draw stroke lines */}
				{currentStroke.length > 1 &&
					currentStroke.slice(0, -1).map((pos, index) => {
						const nextPos = currentStroke[index + 1];
						const fromX = pos.x * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2 + 16;
						const fromY = pos.y * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2 + 16;
						const toX = nextPos.x * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2 + 16;
						const toY = nextPos.y * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2 + 16;

						const length = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
						const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI);

						return (
							<div
								key={`line-${index}`}
								className={strokeLineVariants()}
								style={{
									left: fromX - 6,
									top: fromY - 6,
									width: length + 12,
									height: 12,
									transformOrigin: '6px 50%',
									transform: `rotate(${angle}deg)`,
									zIndex: 10,
								}}
							/>
						);
					})}

				{/* Draw connection points at each stroke vertex */}
				{currentStroke.map((pos, index) => {
					const centerX = pos.x * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2 + 16;
					const centerY = pos.y * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2 + 16;

					return (
						<div
							key={`connection-${index}`}
							className='absolute bg-pink-400 rounded-full pointer-events-none'
							style={{
								left: centerX - 6,
								top: centerY - 6,
								width: 12,
								height: 12,
								zIndex: 11,
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
							left: tap.x - 15,
							top: tap.y - 15,
							zIndex: 20,
						}}
					>
						<div className={tapAnimationVariants().ring()} />
					</div>
				))}

				{/* Success star mark */}
				{isCompleted && currentStroke.length > 0 && (
					<div
						className='absolute flex items-center justify-center'
						style={{
							left: currentStroke[currentStroke.length - 1].x * (TILE_SIZE + TILE_GAP) + 16,
							top: currentStroke[currentStroke.length - 1].y * (TILE_SIZE + TILE_GAP) + 16,
							width: TILE_SIZE,
							height: TILE_SIZE,
							zIndex: 25,
						}}
					>
						<Star size={32} className='text-yellow-400 fill-yellow-400 drop-shadow-lg' />
					</div>
				)}
			</div>

			{/* Controls */}
			<div className='flex gap-4 mb-4'>
				<button onClick={resetLevel} className={buttonVariants({ variant: 'destructive' })}>
					Reset
				</button>
			</div>

			{/* Instructions */}
			<div className={textVariants({ variant: 'instruction' })}>
				Start from the GREEN block and draw one continuous line to fill all blocks. Tap on existing
				line to revert.
			</div>
		</div>
	);
}
