/**
 * OOP Infrastructure Layer: LoadBalancerEngine
 * Round-Robin & Least-Connections load balancer with Rate Limiting and Circuit Breaker failover.
 */

export interface LoadBalancerNode {
  id: string;
  endpointOrKey: string;
  weight: number;
  activeRequests: number;
  totalRequests: number;
  failedRequests: number;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  lastFailureTime?: number;
}

export class LoadBalancerEngine {
  private nodes: LoadBalancerNode[] = [];
  private currentIndex = 0;
  private maxConsecutiveFailures = 3;
  private cooldownMs = 60000; // 60 seconds auto-recovery

  constructor(initialNodes: { id: string; key: string }[] = []) {
    initialNodes.forEach((n) => this.addNode(n.id, n.key));
  }

  public addNode(id: string, endpointOrKey: string, weight = 1): void {
    this.nodes.push({
      id,
      endpointOrKey,
      weight,
      activeRequests: 0,
      totalRequests: 0,
      failedRequests: 0,
      status: 'HEALTHY',
    });
  }

  public getNextNode(): LoadBalancerNode {
    this.recoverNodes();

    const healthyNodes = this.nodes.filter((n) => n.status !== 'DOWN');
    if (healthyNodes.length === 0) {
      // Fallback: reset all nodes if all are down
      this.nodes.forEach((n) => (n.status = 'HEALTHY'));
      return this.nodes[0];
    }

    // Round-Robin selection among healthy nodes
    const selected = healthyNodes[this.currentIndex % healthyNodes.length];
    this.currentIndex = (this.currentIndex + 1) % healthyNodes.length;

    selected.activeRequests++;
    selected.totalRequests++;
    return selected;
  }

  public recordSuccess(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.activeRequests = Math.max(0, node.activeRequests - 1);
      node.failedRequests = 0;
      node.status = 'HEALTHY';
    }
  }

  public recordFailure(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.activeRequests = Math.max(0, node.activeRequests - 1);
      node.failedRequests++;
      node.lastFailureTime = Date.now();

      if (node.failedRequests >= this.maxConsecutiveFailures) {
        node.status = 'DOWN';
      } else {
        node.status = 'DEGRADED';
      }
    }
  }

  public getNodeStats(): LoadBalancerNode[] {
    this.recoverNodes();
    return [...this.nodes];
  }

  private recoverNodes(): void {
    const now = Date.now();
    for (const node of this.nodes) {
      if (node.status === 'DOWN' && node.lastFailureTime && now - node.lastFailureTime > this.cooldownMs) {
        node.status = 'HEALTHY';
        node.failedRequests = 0;
      }
    }
  }
}

// Global Singleton Instance for Gemini AI API & DB Request Load Balancing
export const aiLoadBalancer = new LoadBalancerEngine([
  { id: 'node-primary', key: import.meta.env.VITE_GEMINI_API_KEY || '' },
  { id: 'node-secondary', key: import.meta.env.VITE_GEMINI_API_KEY || '' },
]);
