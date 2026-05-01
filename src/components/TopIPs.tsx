import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import ReactCountryFlag from "react-country-flag";

interface TopIP {
    name: string;
    requests: number;
}

interface IPWithCountry extends TopIP {
    countryCode?: string;
    countryName?: string;
}

interface TopIPsProps {
    ips: TopIP[];
    isLoading?: boolean;
}

// Cache for IP geolocation to avoid repeated requests
const geoCache = new Map<
    string,
    { countryCode: string; countryName: string }
>();

async function getCountryForIP(
    ip: string,
): Promise<{ countryCode: string; countryName: string } | null> {
    // Remove IPv6 prefix if present
    const cleanIP = ip.replace("::ffff:", "");

    // Check cache first
    if (geoCache.has(cleanIP)) {
        return geoCache.get(cleanIP)!;
    }

    try {
        // Using ip-api.com (free, no API key needed, 45 req/min limit)
        const response = await fetch(`https://api.country.is/${cleanIP}`);

        // console.log(response);

        if (!response.ok) return null;

        const data = await response.json();
        if (data.country) {
            const result = {
                countryCode: data.country,
                countryName: data.country,
            };
            geoCache.set(cleanIP, result);
            return result;
        }
        return null;
    } catch {
        return null;
    }
}

// function getFlagEmoji(countryCode: string): Element {
//     // // Convert country code to flag emoji
//     // const codePoints = countryCode
//     //     .toUpperCase()
//     //     .split("")
//     //     .map((char) => 127397 + char.charCodeAt(0));
//     // return String.fromCodePoint(...codePoints);

//     return <ReactCountryFlag countryCode={countryCode} />;
// }

export function TopIPs({ ips, isLoading }: TopIPsProps) {
    const [ipsWithCountry, setIpsWithCountry] = useState<IPWithCountry[]>([]);

    useEffect(() => {
        if (!ips || ips.length === 0) {
            setIpsWithCountry([]);
            return;
        }

        // Start with IPs without country data
        setIpsWithCountry(ips.map((ip) => ({ ...ip })));

        // Fetch country data for each IP
        const fetchCountries = async () => {
            const results: IPWithCountry[] = [];

            for (const ip of ips) {
                const country = await getCountryForIP(ip.name);
                results.push({
                    ...ip,
                    countryCode: country?.countryCode,
                    countryName: country?.countryName,
                });
            }

            setIpsWithCountry(results);
        };

        fetchCountries();
    }, [ips]);

    if (isLoading) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Top IPs
                </h3>
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="flex items-center gap-4 animate-pulse"
                        >
                            <div className="w-8 h-6 bg-secondary rounded" />
                            <div className="flex-1 h-4 bg-secondary rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <Globe className="w-5 h-5 text-primary" />
                Top IPs
            </h3>

            {ipsWithCountry.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                    Sin datos
                </p>
            ) : (
                <div className="space-y-2">
                    {ipsWithCountry.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-muted-foreground w-4">
                                    {i + 1}
                                </span>
                                <span
                                    className="text-xl"
                                    title={item.countryName}
                                >
                                    {item.countryCode ? (
                                        <ReactCountryFlag
                                            countryCode={item.countryCode}
                                            svg
                                            style={{
                                                width: "1em",
                                                height: "1em",
                                                borderRadius: "25%",
                                            }}
                                            title={item.countryName}
                                        />
                                    ) : (
                                        "🌐"
                                    )}
                                </span>
                                <code className="text-xs sm:text-sm bg-secondary px-2 py-0.5 rounded text-foreground truncate">
                                    {item.name.replace("::ffff:", "")}
                                </code>
                            </div>
                            <span className="text-primary font-semibold">
                                {item.requests}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
