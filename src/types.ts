export type LarasJSON = Record<string, any>;

export interface AIEnhanceRequest {
  instruction: string;
  draft: LarasJSON;
}

export interface AIEnhanceResponse {
  enhanced: LarasJSON | string;
}
