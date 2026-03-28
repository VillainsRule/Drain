import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import api, { errorFrom } from '@/lib/eden';

import CircleDollarSign from 'lucide-react/icons/circle-dollar-sign';
import KeyRound from 'lucide-react/icons/key-round';
import Search from 'lucide-react/icons/search';

import siteManager from '@/managers/SiteManager';

const iconSize = 32;

const extractPrimaryColor = (img: HTMLImageElement): string => {
    const canvas = document.createElement('canvas');
    canvas.width = iconSize;
    canvas.height = iconSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#888888';

    ctx.drawImage(img, 0, 0, iconSize, iconSize);
    const { data } = ctx.getImageData(0, 0, iconSize, iconSize);

    const buckets: Record<string, number> = {};

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];

        if (a < 128) continue;

        const brightness = (r + g + b) / 3;
        if (brightness > 230 || brightness < 20) continue;

        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        if (saturation < 0.15) continue;

        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;
        buckets[key] = (buckets[key] ?? 0) + 1;
    }

    const top = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
    if (!top) return '#888888';

    const [qr, qg, qb] = top[0].split(',').map(Number);
    return `rgb(${qr},${qg},${qb})`;
}

const Discovery = observer(function Discovery() {
    const navigate = useNavigate();

    const [sites, setSites] = useState<{ domain: string, keys: number, balance?: number }[]>([]);
    const [requested, setRequested] = useState<Set<string>>(new Set());
    const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
    const [iconColors, setIconColors] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const getDiscovery = () => api.v1.discovery.get().then((discRes) => {
        if (discRes.data) {
            const sorted = [...discRes.data.sites].sort((a, b) => b.keys - a.keys);
            setSites(sorted);

            const requested = discRes.data.requests.map(r => r.site);
            setRequested(new Set(requested));
        }

        setLoading(false);
    });

    useEffect(() => {
        getDiscovery();
    }, []);

    const handleIconLoad = (domain: string, e: React.SyntheticEvent<HTMLImageElement>) => {
        const color = extractPrimaryColor(e.currentTarget);
        setIconColors(prev => ({ ...prev, [domain]: color }));
    };

    const handleRequest = (domain: string) => api.v1.discovery.requests.post({ domain }).then((res) => {
        if (res.data) getDiscovery();
        else alert(errorFrom(res));
    });

    const filtered = sites.filter(s => s.domain.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className='flex flex-col h-full w-5/6 gap-6 overflow-y-auto drain-scrollbar mt-6 pr-2.5'>
            <div className='flex justify-between items-center gap-3 md:gap-0 w-full flex-col md:flex-row'>
                <div>
                    <h2 className='text-2xl font-bold text-center md:text-left'>discovery</h2>
                    <p className='text-sm text-muted-foreground mt-0.5'>browse and request access to available sites</p>
                </div>

                <div className='relative w-5/6 md:w-56'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
                    <Input className='pl-9' placeholder='search domains...' value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {loading ? (
                <div className='flex flex-col gap-3 w-full'>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className='flex items-center gap-4 px-5 py-4 border rounded-xl animate-pulse'>
                            <div className='w-11 h-11 rounded-xl bg-muted shrink-0' />
                            <div className='flex flex-col gap-2 flex-1'>
                                <div className='h-4 w-32 rounded bg-muted' />
                                <div className='h-3 w-20 rounded bg-muted' />
                            </div>
                            <div className='h-8 w-32 rounded-md bg-muted shrink-0' />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-16'>no sites found</p>
            ) : (
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 w-full pb-6'>
                    {filtered.map((site) => {
                        const hasAccess = siteManager.siteList.includes(site.domain);
                        const primaryColor = iconColors[site.domain];

                        const iconBg = primaryColor ? `color-mix(in srgb, ${primaryColor} 18%, transparent)` : 'hsl(var(--muted))';
                        const backgroundBg = primaryColor ? `color-mix(in srgb, ${primaryColor} 4%, transparent)` : 'hsl(var(--muted))';

                        return (
                            <div
                                key={site.domain}
                                className={`flex items-center gap-4 px-5 py-4 border rounded-xl transition-colors duration-150 ${hasAccess ? 'border-green-500/40 bg-green-500/5' : 'hover:border-border'}`}
                                style={{ background: backgroundBg }}
                            >
                                <div
                                    className='w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300'
                                    style={{ background: iconBg }}
                                >
                                    {imgErrors.has(site.domain) ? (
                                        <img src='https://raw.githubusercontent.com/chromium/chromium/f1b3e85df893fd702cad93208a6e0198719cb23b/chrome/browser/resources/new_tab_page/icons/generic_globe.svg' alt='globe' className='w-6 h-6 object-contain' />
                                    ) : (
                                        <img
                                            src={`https://icon.horse/icon/${site.domain}`}
                                            alt={site.domain}
                                            className='w-6 h-6 object-contain rounded-xs'
                                            crossOrigin='anonymous'
                                            onLoad={e => handleIconLoad(site.domain, e)}
                                            onError={() => setImgErrors(prev => new Set([...prev, site.domain]))}
                                        />
                                    )}
                                </div>

                                <div className='flex flex-col gap-0.5 flex-1 min-w-0'>
                                    <span className='text-sm font-semibold truncate'>{site.domain}</span>

                                    <span className='text-xs text-muted-foreground flex items-center gap-1'>
                                        <KeyRound className='h-3 w-3' />
                                        {site.keys}

                                        {site.balance !== undefined && (
                                            <span className='text-xs text-muted-foreground flex items-center ml-2 gap-1'>
                                                <CircleDollarSign className='h-3 w-3 mt-px' />
                                                {site.balance}
                                            </span>
                                        )}
                                    </span>
                                </div>

                                <div className='shrink-0'>
                                    <div className='shrink-0'>
                                        {hasAccess ? (
                                            <Badge
                                                variant='outline'
                                                className='gap-1.5 text-green-600 border-green-500/40 px-3 py-1.5 cursor-pointer hover:bg-green-500/10 transition-colors'
                                                onClick={() => {
                                                    siteManager.select(site.domain);
                                                    navigate('/domain/' + site.domain);
                                                }}
                                            >
                                                visit site
                                            </Badge>
                                        ) : requested.has(site.domain) ? (
                                            <Badge variant='outline' className='text-muted-foreground px-3 py-1.5'>
                                                pending review
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant='outline'
                                                className='px-3 py-1.5 cursor-pointer hover:bg-accent transition-colors'
                                                onClick={() => handleRequest(site.domain)}
                                            >
                                                request access
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

export default Discovery;