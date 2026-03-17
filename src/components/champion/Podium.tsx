import { teamsByCode } from '@/data/teams';

interface PodiumProps {
  championCode: string;
  secondCode?: string;
  thirdCode?: string;
}

export default function Podium({ championCode, secondCode, thirdCode }: PodiumProps) {
  const champion = teamsByCode[championCode];
  const secondTeam = secondCode ? teamsByCode[secondCode] : null;
  const thirdTeam = thirdCode ? teamsByCode[thirdCode] : null;

  if (!champion || !secondTeam || !thirdTeam) return null;

  return (
    <div className="w-full max-w-[300px] mx-auto">
      <div className="flex items-end justify-center gap-1.5">
        {/* 2nd Place */}
        <div className="flex-1 flex flex-col items-center">
          <div className="mb-2">
            <img src={`https://flagcdn.com/w320/${secondCode!.toLowerCase()}.png`} alt={secondTeam.name} className="w-12 h-8 object-cover rounded-sm block mb-0.5 mx-auto" />
            <p className="text-[10px] font-bold text-medal-silver/80 font-body truncate w-full text-center">{secondTeam.name}</p>
          </div>
          <div className="w-full">
            <div className="h-[72px] rounded-t-lg bg-gradient-to-t from-medal-silver/25 to-medal-silver/8 border border-medal-silver/15 border-b-0 flex items-center justify-center">
              <span className="text-medal-silver/50 text-[28px] font-black">2</span>
            </div>
          </div>
        </div>

        {/* 1st Place */}
        <div className="flex-1 flex flex-col items-center">
          <div className="mb-2">
            <img src={`https://flagcdn.com/w320/${championCode.toLowerCase()}.png`} alt={champion.name} className="w-14 h-9 object-cover rounded-sm block mb-0.5 mx-auto" />
            <p className="text-[10px] font-bold text-primary/80 font-body truncate w-full text-center">{champion.name}</p>
          </div>
          <div className="w-full">
            <div className="h-[100px] rounded-t-lg bg-gradient-to-t from-primary/25 to-primary/8 border border-primary/20 border-b-0 flex items-center justify-center">
              <span className="text-primary/50 text-[32px] font-black">1</span>
            </div>
          </div>
        </div>

        {/* 3rd Place */}
        <div className="flex-1 flex flex-col items-center">
          <div className="mb-2">
            <img src={`https://flagcdn.com/w320/${thirdCode!.toLowerCase()}.png`} alt={thirdTeam.name} className="w-12 h-8 object-cover rounded-sm block mb-0.5 mx-auto" />
            <p className="text-[10px] font-bold text-medal-bronze/80 font-body truncate w-full text-center">{thirdTeam.name}</p>
          </div>
          <div className="w-full">
            <div className="h-[52px] rounded-t-lg bg-gradient-to-t from-medal-bronze/25 to-medal-bronze/8 border border-medal-bronze/15 border-b-0 flex items-center justify-center">
              <span className="text-medal-bronze/50 text-[24px] font-black">3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Podium base line */}
      <div>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
    </div>
  );
}
