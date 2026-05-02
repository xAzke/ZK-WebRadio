import { useState } from "react";
import { Radio, ShieldCheck, Zap, Waves, Lock, ArrowRight, Binary, Fingerprint } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BlurFade } from "@/components/magicui/blur-fade";

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
			setError("Authentication link failed. Verify network status.");
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-6 bg-[#060608] overflow-hidden relative font-sans">
			{/* High-Fidelity Technical Background */}
			<div className="absolute inset-0 z-0 pointer-events-none">
				{/* Very Subtle Grid */}
				<div 
					className="absolute inset-0 opacity-[0.03]" 
					style={{ backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
				/>
				{/* Deep Ambient Glows */}
				<div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(59,130,246,0.03)_0%,transparent_70%)] rounded-full" />
				<div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(37,99,235,0.03)_0%,transparent_70%)] rounded-full" />
			</div>

			<BlurFade delay={0.1}>
				<div className="w-full max-w-[420px] relative z-10 group">
					{/* Professional Frame Accents */}
					<div className="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 border-white/10 rounded-tl-xl" />
					<div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 border-white/10 rounded-br-xl" />

					<div className="bg-[#0a0a0c] border border-white/5 rounded-3xl p-10 shadow-2xl relative overflow-hidden text-white">
						{/* Hardware ID Detail */}
						{/* <div className="absolute top-0 right-10 flex gap-1">
							<div className="w-1 h-3 bg-primary/20" />
							<div className="w-1 h-3 bg-primary/40" />
							<div className="w-1 h-3 bg-primary/60" />
						</div> */}

						<div className="flex flex-col items-center mb-5">
							<div className="relative mb-6">
								<div className="w-16 h-16 bg-white/[0.02] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-primary/20 transition-all duration-700 shadow-inner">
									<Radio className="w-8 h-8 text-primary/80" />
								</div>
								<div className="absolute -right-1 -bottom-1 w-6 h-6 bg-[#060608] rounded-lg border border-white/10 flex items-center justify-center">
									<Lock className="w-3 h-3 text-primary/40" />
								</div>
							</div>

							<div className="text-center space-y-2">
								<h1 className="text-2xl font-bold tracking-tighter uppercase text-white/90">
									Terminal<span className="text-primary/60">.Access</span>
								</h1>
								<div className="flex items-center justify-center gap-3">
									<div className="h-px w-8 bg-white/5" />
									<span className="text-[8px] font-bold uppercase tracking-[0.4em] text-white/20">
										System V2.4 / Relay 01
									</span>
									<div className="h-px w-8 bg-white/5" />
								</div>
							</div>
						</div>

						<div className="space-y-7">
							{error && (
								<BlurFade delay={0.05} direction="up">
									<div className="flex items-center gap-3 p-4 bg-red-500/[0.03] border border-red-500/10 rounded-xl text-[9px] font-bold uppercase tracking-widest text-red-400/80 font-mono">
										<ShieldCheck className="w-4 h-4 shrink-0 opacity-50" />
										{error}
									</div>
								</BlurFade>
							)}

							<button
								onClick={handleDiscordLogin}
								disabled={isLoading}
								className="group/btn w-full h-14 relative flex items-center justify-between px-6 bg-white/[0.03] hover:bg-white/[0.06] text-white font-bold rounded-2xl transition-all duration-500 border border-white/5 hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg"
							>
								<div className="flex items-center gap-4 relative z-10">
									<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover/btn:bg-primary/20 transition-colors">
										<Fingerprint className="w-4 h-4 text-primary" />
									</div>
									<span className="text-[10px] font-bold uppercase tracking-[0.2em]">
										{isLoading ? "Authenticating..." : "Authorize Identity"}
									</span>
								</div>
								
								<div className="flex items-center gap-2 relative z-10">
									<div className="h-px w-4 bg-white/10 group-hover/btn:w-8 transition-all duration-500" />
									<ArrowRight className="w-4 h-4 text-white/20 group-hover/btn:text-primary transition-all group-hover/btn:translate-x-1" />
								</div>
								
								{/* Technical Scanline Effect on Hover */}
								<div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(59,130,246,0.05)_50%,transparent_100%)] -translate-y-full group-hover/btn:animate-[scanline_2s_linear_infinite]" />
							</button>

							{/* Status Footer */}
							<div className="flex flex-col gap-4">
								<div className="flex items-center justify-between text-[7px] font-bold text-white/10 uppercase tracking-[0.4em]">
									<div className="flex items-center gap-2">
										<Binary className="w-2.5 h-2.5" />
										<span>Encryption Established</span>
									</div>
									<span>Node: SA-01</span>
								</div>
								<div className="h-1 w-full bg-white/[0.02] rounded-full overflow-hidden">
									<div className="h-full w-1/3 bg-primary/20 animate-pulse" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</BlurFade>

			{/* Post-Process Grain */}
			<div
				className="absolute inset-0 z-[1] opacity-[0.1] pointer-events-none mix-blend-soft-light"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
				}}
			/>
		</div>
	);
}
