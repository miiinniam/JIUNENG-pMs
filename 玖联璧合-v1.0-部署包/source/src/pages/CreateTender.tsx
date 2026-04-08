import React, { useState } from 'react';
import { 
  Search,
  FilePlus, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Package, 
  Truck, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Info,
  Layers,
  Activity,
  Maximize2,
  Plus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { id: 1, label: '始发与目的', icon: MapPin },
  { id: 2, label: '货物详情', icon: Package },
  { id: 3, label: '运输要求', icon: Truck },
  { id: 4, label: '确认发布', icon: CheckCircle2 },
];

export const CreateTender: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    cargoType: '',
    weight: '',
    volume: '',
    deadline: '',
    budget: '',
    notes: '',
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-[#0A2540]">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 sticky top-0 z-50">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-[#0A2540] transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3 ml-4">
          <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center shadow-lg">
            <FilePlus className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">新建招标订单</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <Info className="w-4 h-4" /> 自动保存中...
          </div>
          <button className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-[#0A2540] transition-colors">取消</button>
          <button className="px-6 py-2 bg-[#0A2540] text-white rounded-xl text-sm font-bold hover:bg-[#1a3a5a] transition-all shadow-lg shadow-blue-900/10">保存草稿</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-8 md:p-12">
        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-[#0061FF] -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            ></div>
            {STEPS.map((step) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-3 group">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4",
                  currentStep >= step.id 
                    ? "bg-[#0061FF] text-white border-white shadow-lg shadow-blue-500/20" 
                    : "bg-white text-gray-300 border-gray-100"
                )}>
                  <step.icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "text-xs font-bold uppercase tracking-widest transition-colors",
                  currentStep >= step.id ? "text-[#0A2540]" : "text-gray-400"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-8 md:p-12 min-h-[500px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1"
            >
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-[#0A2540]">始发地与目的地</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">请选择货物的起始位置与最终交付地点，系统将为您匹配最优路线。</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#FF6B00]" /> 始发地
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="搜索城市、港口或仓库..." 
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-[#0061FF] transition-all"
                        />
                        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['胡志明市', '河内', '岘港', '海防'].map((city) => (
                          <button key={city} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-500 transition-colors">{city}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#0061FF]" /> 目的地
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="搜索城市、港口或仓库..." 
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-[#0061FF] transition-all"
                        />
                        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['深圳', '广州', '昆明', '南宁'].map((city) => (
                          <button key={city} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-500 transition-colors">{city}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-[#0A2540]">货物详情</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">提供准确的货物信息，以便代理商给出精准报价。</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">货物类型</label>
                        <select className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-[#0061FF] cursor-pointer">
                          <option>电子配件</option>
                          <option>纺织服装</option>
                          <option>机械设备</option>
                          <option>农产品</option>
                          <option>矿产物料</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">总重量 (吨)</label>
                          <input type="number" className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-[#0061FF]" placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">总体积 (CBM)</label>
                          <input type="number" className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-[#0061FF]" placeholder="0.00" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">包装方式</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['托盘', '木箱', '纸箱', '散装'].map((type) => (
                            <button key={type} className="p-4 border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-500 hover:border-[#0061FF] hover:text-[#0061FF] transition-all flex items-center justify-center gap-2">
                              <Package className="w-4 h-4" /> {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-[#0A2540]">运输要求与预算</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">设定截止日期与期望预算，并备注特殊要求。</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" /> 招标截止日期
                        </label>
                        <input type="date" className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-[#0061FF]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" /> 期望预算 (CNY)
                        </label>
                        <input type="number" className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-[#0061FF]" placeholder="输入您的心理价位" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">特殊备注</label>
                      <textarea 
                        className="w-full p-6 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-[#0061FF] min-h-[180px]"
                        placeholder="例如：需要温控、易碎品、清关特殊要求等..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="flex flex-col items-center justify-center space-y-8 py-12">
                  <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 shadow-inner">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-[#0A2540]">确认发布招标</h2>
                    <p className="text-gray-500 text-base max-w-md mx-auto">请核对以上信息无误。发布后，系统将立即通知符合条件的代理商参与竞标。</p>
                  </div>
                  <div className="w-full max-w-md bg-gray-50 rounded-3xl p-8 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                      <span className="text-sm text-gray-400 font-medium">路线</span>
                      <span className="text-sm font-bold text-[#0A2540]">胡志明市 → 深圳</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                      <span className="text-sm text-gray-400 font-medium">货物</span>
                      <span className="text-sm font-bold text-[#0A2540]">电子配件 / 12.5 吨</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                      <span className="text-sm text-gray-400 font-medium">预算</span>
                      <span className="text-sm font-bold text-[#FF6B00]">¥ 45,000.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400 font-medium">截止日期</span>
                      <span className="text-sm font-bold text-[#0A2540]">2026-04-10</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer Actions */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
            <button 
              onClick={prevStep}
              disabled={currentStep === 1}
              className={cn(
                "px-8 py-3 text-sm font-bold transition-all flex items-center gap-2",
                currentStep === 1 ? "text-gray-200" : "text-gray-400 hover:text-[#0A2540]"
              )}
            >
              <ChevronLeft className="w-5 h-5" /> 上一步
            </button>
            
            {currentStep < 4 ? (
              <button 
                onClick={nextStep}
                className="px-10 py-4 bg-[#0A2540] text-white rounded-2xl text-sm font-bold hover:bg-[#1a3a5a] transition-all shadow-xl shadow-blue-900/20 flex items-center gap-2"
              >
                下一步 <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={() => navigate('/projects')}
                className="px-12 py-4 bg-[#FF6B00] text-white rounded-2xl text-sm font-bold hover:bg-[#e66000] transition-all shadow-xl shadow-orange-500/20 flex items-center gap-2"
              >
                立即发布招标 <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
