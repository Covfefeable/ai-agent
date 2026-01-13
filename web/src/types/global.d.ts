export {};

declare global {
  interface Window {
    /**
     * 全局上报用户事件方法
     * @param eventName 事件名称
     * @param extraData 额外数据（可选，字符串或对象）
     */
    reportEvent: (eventName: string, extraData?: string | object) => void;
  }
}
