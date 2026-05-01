import { useState } from "react";
import { Radio, ShieldCheck, Zap, Waves } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const handleDiscordLogin = async () => {
		setError("");
		setIsLoading(true);

		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: "discord",
				options: {
					redirectTo: window.location.origin,
				},
			});

			if (error) throw error;
		} catch (err) {
			console.error("Login error:", err);
			setError("Error al iniciar sesión con Discord");
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0c] overflow-hidden relative">
			{/* Animated Ambient Background */}
			<div className="absolute inset-0 z-0">
				<div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />

				{/* CSS Waves Background Overlay */}
				<div
					className="absolute inset-0 opacity-[0.03] pointer-events-none"
					style={{
						backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23FFFFFF' d='M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C86.9,14.5,81.2,29.1,72.1,41.2C63,53.3,50.5,63,36.8,70.5C23.1,78,8.2,83.4,-5.9,82.4C-20,81.4,-33.2,74,-44.6,64.8C-56,55.7,-65.6,44.7,-73,32.3C-80.4,19.9,-85.7,6.1,-84.3,-7.1C-82.9,-20.3,-74.8,-32.8,-64.5,-43.3C-54.3,-53.8,-41.9,-62.3,-28.9,-70.1C-15.9,-77.9,-2.4,-85,11.3,-84.1C25,-83.2,30.6,-83.6,44.7,-76.4Z' transform='translate(100 100)' /%3E%3C/svg%3E")`,
						backgroundSize: "600px",
					}}
				/>
			</div>

			<div className="w-full max-w-[440px] relative z-10 group">
				{/* Decorative Elements */}
				<div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/30 transition-all duration-700" />
				<div className="absolute -bottom-12 -right-12 w-24 h-24 bg-blue-500/20 blur-2xl rounded-full group-hover:bg-blue-500/30 transition-all duration-700" />

				<div className="bg-[#121216]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-10 shadow-2xl relative overflow-hidden text-white">
					{/* Top Hardware Detail */}
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

					<div className="flex flex-col items-center mb-10">
						<div className="relative mb-6">
							<div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.15)] animate-float">
								<Radio className="w-10 h-10 text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
							</div>
							<div className="absolute -right-2 -bottom-2 w-8 h-8 bg-[#1a1a20] rounded-xl border border-white/5 flex items-center justify-center shadow-lg">
								<Zap className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />
							</div>
						</div>

						<div className="text-center space-y-2">
							<h1 className="text-3xl font-bold tracking-tight text-white/90">
								ZK-<span className="text-primary">Radio</span>
							</h1>
							<div className="flex items-center justify-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
								<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
								<span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
									Admin Console v2.0
								</span>
							</div>
						</div>
					</div>

					<div className="space-y-6">
						<div className="text-center">
							<p className="text-sm text-white/40 leading-relaxed max-w-[280px] mx-auto">
								Accede al centro de transmisiones para gestionar
								frecuencias, estadísticas y caché.
							</p>
						</div>

						{error && (
							<div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 animate-shake">
								<ShieldCheck className="w-4 h-4 shrink-0" />
								{error}
							</div>
						)}

						<button
							onClick={handleDiscordLogin}
							disabled={isLoading}
							className="group/btn w-full h-14 relative flex items-center justify-center gap-4 bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_20px_rgba(88,101,242,0.3)] overflow-hidden"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover/btn:animate-shine" />

							<svg
								className="w-6 h-6 relative z-10 transition-transform duration-500 group-hover/btn:rotate-[360deg]"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
							</svg>
							<span className="relative z-10 text-sm tracking-wide uppercase font-bold">
								{isLoading
									? "Sincronizando..."
									: "Autorizar con Discord"}
							</span>
						</button>
					</div>

					<div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between text-[10px] text-white/20 uppercase tracking-[0.2em]">
						<div className="flex items-center gap-1.5">
							<Waves className="w-3 h-3 animate-pulse" />
							<span>Signal Secure</span>
						</div>
						<span>Auth-Protected</span>
					</div>
				</div>

				{/* Bottom Footer Info */}
				<div className="mt-8 text-center animate-fade-in-delayed">
					<p className="text-[10px] text-white/10 uppercase tracking-[0.4em] font-medium">
						© 2026 ZK-WebRadio Systems
					</p>
				</div>
			</div>

			{/* Background Texture Effect */}
			<div
				className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none"
				style={{
					backgroundImage: `url("https://www.transparenttextures.com/patterns/pinstriped-suit.png")`,
				}}
			/>
			<div
				className="absolute inset-0 z-[2] opacity-[0.2] pointer-events-none mix-blend-soft-light"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
				}}
			/>
		</div>
	);
}
