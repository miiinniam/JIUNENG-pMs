import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, Trophy } from 'lucide-react';

export interface AwardDetailHeroProps {
  status: string;
  awardId: string;
  title: string;
  awardDate: string;
  deadline: string;
}

export const AwardDetailHero: React.FC<AwardDetailHeroProps> = ({
  status,
  awardId,
  title,
  awardDate,
  deadline,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gradient-to-br from-[#0A2540] to-[#1a3a5a] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
      <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl shadow-orange-500/30">
        <Trophy className="w-10 h-10 text-white" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
            {status}
          </span>
          <span className="text-gray-400 text-sm font-medium">
            通知单号: {awardId}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight">
          恭喜中标：{title}
        </h1>
        <p className="text-gray-300 text-sm flex flex-wrap items-center gap-4 pt-2">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" /> 中标时间: {awardDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" /> 交付截止: {deadline}
          </span>
        </p>
      </div>
    </div>
  </motion.div>
);
