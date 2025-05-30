import { tv } from 'tailwind-variants';

// Game cell variant definitions
export const cellVariants = tv({
	base: 'absolute transition-all duration-300 rounded-sm',
	variants: {
		type: {
			empty: '', // Empty cell - no styling
			target:
				'bg-neutral-500 hover:shadow-lg hover:from-yellow-400 hover:to-orange-500 transform hover:scale-105',
			painted: 'bg-green-400',
			start: 'bg-green-400',
		},
	},
	defaultVariants: {
		type: 'empty',
	},
});

// Button variant definitions
export const buttonVariants = tv({
	base: 'px-6 py-3 text-white rounded-full font-bold transform hover:scale-105 transition-all duration-200 shadow-lg',
	variants: {
		variant: {
			primary:
				'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
			destructive: 'bg-red-500 hover:bg-red-600',
			success:
				'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
		},
		size: {
			sm: 'px-4 py-2 text-sm',
			md: 'px-6 py-3 text-base',
			lg: 'px-8 py-4 text-lg',
		},
	},
	defaultVariants: {
		variant: 'primary',
		size: 'md',
	},
});

// Stroke line variant definitions
export const strokeLineVariants = tv({
	base: 'absolute bg-green-500 rounded-full pointer-events-none',
	variants: {
		thickness: {
			thin: 'h-2',
			normal: 'h-4',
			thick: 'h-6',
		},
	},
	defaultVariants: {
		thickness: 'normal',
	},
});

// Tap animation variant definitions
export const tapAnimationVariants = tv({
	base: 'absolute pointer-events-none',
	slots: {
		ring: 'border-4 border-yellow-300 rounded-full animate-ping opacity-75',
	},
	variants: {
		size: {
			sm: {
				ring: 'w-6 h-6',
			},
			md: {
				ring: 'w-8 h-8',
			},
			lg: {
				ring: 'w-10 h-10',
			},
		},
	},
	defaultVariants: {
		size: 'md',
	},
});

// UI text variant definitions
export const textVariants = tv({
	base: 'font-bold',
	variants: {
		variant: {
			title: 'text-white text-2xl',
			subtitle: 'text-yellow-300 text-lg animate-bounce',
			instruction: 'text-cyan-200 text-sm text-center max-w-md drop-shadow-md',
			startLabel: 'text-white text-lg flex items-center justify-center pointer-events-none',
		},
	},
});

// Layout variant definitions
export const layoutVariants = tv({
	base: '',
	variants: {
		type: {
			gameContainer: 'relative rounded-2xl p-4 mb-6 select-none',
			mainWrapper:
				'w-full h-screen flex flex-col items-center justify-center overflow-hidde bg-neutral-700',
			controlsWrapper: 'flex gap-4 mb-4',
		},
	},
});
