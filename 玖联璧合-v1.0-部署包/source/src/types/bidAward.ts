/** 货物清单项（中标详情页展示） */
export interface AwardCargoItem {
  id: number | string;
  name: string;
  spec: string;
  weight: string;
  volume: string;
  pkg: string;
}

export interface AwardTenderInfo {
  route: string;
  type: string;
  cargoList: AwardCargoItem[];
  requirements: string;
}

export interface AwardBidInfo {
  price: string;
  currency: string;
  estimatedTime: string;
  remarks: string;
}

/** 页面与业务层使用的中标详情模型 */
export interface BidAwardDetailData {
  id: string;
  tenderId: string;
  title: string;
  awardDate: string;
  deadline: string;
  status: string;
  /** 年度剩余可撤销次数，由 GET 详情接口返回 */
  revokeChancesRemaining: number;
  tenderInfo: AwardTenderInfo;
  bidInfo: AwardBidInfo;
}

/** 后端可能返回 snake_case，在服务层归一化为 BidAwardDetailData */
export interface BidAwardDetailApiDTO {
  id: string;
  tender_id?: string;
  tenderId?: string;
  title: string;
  award_date?: string;
  awardDate?: string;
  deadline: string;
  status: string;
  revoke_chances_remaining?: number;
  revokeChancesRemaining?: number;
  tender_info?: {
    route: string;
    type: string;
    cargo_list?: AwardCargoItem[];
    cargoList?: AwardCargoItem[];
    requirements: string;
  };
  tenderInfo?: AwardTenderInfo;
  bid_info?: {
    price: string;
    currency: string;
    estimated_time?: string;
    estimatedTime?: string;
    remarks: string;
  };
  bidInfo?: AwardBidInfo;
}

export interface RevokeAwardResponse {
  revokeChancesRemaining?: number;
  revoke_chances_remaining?: number;
  message?: string;
}
