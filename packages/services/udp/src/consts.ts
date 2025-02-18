/**
 * 理论最大大小：65527 字节（UDP 数据部分）
 * 推荐大小：不超过 1472 字节（以太网 MTU 减去 IP 和 UDP 头部）
 * 实际大小：应根据具体网络环境和应用需求进行调整，避免分片和丢包
 */
export const sizeLimit = 1472; // 65527; //65535 -8

export const udpUrl$ = /^udp(s)?:\/\//i;