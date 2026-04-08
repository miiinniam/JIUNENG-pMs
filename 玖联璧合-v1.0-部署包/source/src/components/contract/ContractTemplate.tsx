import React from 'react';
import type { AgentRow, BidRow, ContractType, TenderRow } from '../../database/schema';

interface Props {
  contractType: ContractType;
  contractId: string;
  tender: TenderRow;
  bid: BidRow;
  agent: AgentRow;
}

function CargoTable({ cargoJson }: { cargoJson: string | null }) {
  if (!cargoJson) return <p>（见运输任务单附件）</p>;
  try {
    const items = JSON.parse(cargoJson) as { id: number; name: string; spec: string; weight: string; volume: string; pkg: string }[];
    return (
      <table className="w-full border-collapse text-xs mt-2">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-1 text-left">品名</th>
            <th className="border border-gray-300 px-2 py-1 text-left">规格</th>
            <th className="border border-gray-300 px-2 py-1 text-right">重量(kg)</th>
            <th className="border border-gray-300 px-2 py-1 text-right">体积(m³)</th>
            <th className="border border-gray-300 px-2 py-1 text-left">包装</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="border border-gray-300 px-2 py-1">{item.name}</td>
              <td className="border border-gray-300 px-2 py-1">{item.spec}</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{item.weight}</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{item.volume}</td>
              <td className="border border-gray-300 px-2 py-1">{item.pkg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } catch {
    return <p>（货物明细数据异常）</p>;
  }
}

export const ContractTemplate: React.FC<Props> = ({ contractType, contractId, tender, bid, agent }) => {
  const isExecution = contractType === 'execution';
  const title = isExecution ? '货物运输执行合同' : '中标通知暨运输服务合同';
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto space-y-5 text-sm text-gray-700 leading-relaxed font-[serif]">
      <h2 className="text-center text-lg font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-center text-xs text-gray-400">合同编号：{contractId}</p>

      {/* 甲乙方信息 */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-1">
        <p><strong>甲方（委托方）：</strong>玖链跨境物流管理平台</p>
        <p><strong>乙方（承运方）：</strong>{agent.name || '—'}</p>
        <p className="text-xs text-gray-500">
          联系人：{agent.contact || '—'} | 电话：{agent.phone || '—'} | 所在地：{agent.location || '—'}
        </p>
      </div>

      <p>
        鉴于甲方通过招标程序（招标编号：<strong>{tender.id}</strong>，标题：「{tender.title}」），
        确定乙方为中标承运方，双方本着平等自愿、互惠互利的原则，经友好协商，达成如下协议：
      </p>

      {/* 第一条：运输标的 */}
      <h3 className="font-bold text-gray-900 mt-4 border-b border-gray-200 pb-1">第一条 运输标的</h3>
      <div className="space-y-2">
        <p><strong>1.1 运输路线：</strong>{tender.origin} → {tender.destination}（{tender.route_label}）</p>
        <p><strong>1.2 业务类型：</strong>{tender.biz_type || '—'}</p>
        <p><strong>1.3 货物概要：</strong>{tender.cargo_summary}</p>
        <div>
          <strong>1.4 货物明细：</strong>
          <CargoTable cargoJson={tender.cargo_json} />
        </div>
        {tender.requirements && (
          <p><strong>1.5 特殊要求：</strong>{tender.requirements}</p>
        )}
      </div>

      {/* 第二条：费用 */}
      <h3 className="font-bold text-gray-900 mt-4 border-b border-gray-200 pb-1">第二条 运输费用及结算</h3>
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-1">
        <p><strong>2.1 中标价格：</strong>
          <span className="text-lg font-bold text-[#FF6B00]">{bid.currency} {bid.price?.toLocaleString()}</span>
        </p>
        <p><strong>2.2 预计交付时间：</strong>{bid.estimated_time || '按任务单约定'}</p>
        {bid.remarks && <p><strong>2.3 投标备注：</strong>{bid.remarks}</p>}
      </div>
      <p>2.4 结算方式：货物安全送达指定地点并经收货方签收后，乙方凭签收单及合规发票向甲方申请结算，甲方在收到合规单据后 <strong>30 个工作日</strong>内完成付款。</p>

      {/* 第三条：权利义务 */}
      <h3 className="font-bold text-gray-900 mt-4 border-b border-gray-200 pb-1">第三条 双方权利与义务</h3>
      <p>3.1 甲方应如实提供货物信息，并按约定支付运费。</p>
      <p>3.2 乙方应保证运输车辆及人员符合国家法律法规要求，确保货物安全、准时送达。</p>
      <p>3.3 运输途中如发生货物损坏、灭失，乙方应按照实际损失承担赔偿责任（不超过本合同总金额的 120%）。</p>

      {/* 执行合同特有条款 */}
      {isExecution && (
        <>
          <h3 className="font-bold text-gray-900 mt-4 border-b border-gray-200 pb-1">第四条 执行条款</h3>
          <p>4.1 乙方应在合同生效后 <strong>24 小时</strong>内安排提货，并在甲方系统中实时更新运输状态。</p>
          <p>4.2 运输过程中如遇不可抗力，乙方应在 <strong>2 小时</strong>内通知甲方并提供书面说明。</p>
          <p>4.3 乙方不得将本合同项下的运输任务转包或分包给第三方，除非事先取得甲方书面同意。</p>

          <h3 className="font-bold text-gray-900 mt-4 border-b border-gray-200 pb-1">第五条 考核与评价</h3>
          <p>5.1 甲方将根据运输时效、货物完好率、服务态度等维度对乙方进行 1-5 星评价。</p>
          <p>5.2 连续两次评分低于 3 星，甲方有权暂停与乙方的合作资格。</p>

          <h3 className="font-bold text-gray-900 mt-4 border-b border-gray-200 pb-1">第六条 付款节点</h3>
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 space-y-1 text-xs">
            <p>节点一：提货完成 — 支付合同总额的 <strong>30%</strong></p>
            <p>节点二：运抵目的口岸 — 支付合同总额的 <strong>40%</strong></p>
            <p>节点三：签收确认 — 支付合同总额的 <strong>30%</strong></p>
          </div>
        </>
      )}

      {/* 签署信息 */}
      <div className="mt-8 pt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-xs text-gray-500">
        <div>
          <p className="font-bold text-gray-700 mb-2">甲方（盖章/签字）</p>
          <p>玖链跨境物流管理平台</p>
          <p className="mt-4">签署日期：{today}</p>
        </div>
        <div>
          <p className="font-bold text-gray-700 mb-2">乙方（盖章/签字）</p>
          <p>{agent.name || '________'}</p>
          <p className="mt-4">签署日期：________</p>
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-300 mt-4">— 合同正文到此结束 —</p>
    </div>
  );
};
