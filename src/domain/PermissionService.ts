/**
 * PermissionService
 * Centralized Enterprise RBAC (Role-Based Access Control) Engine.
 * Evaluates permissions and accessible views across 6 system roles:
 * - 'worker': Operational field employee
 * - 'supervisor': Warehouse section supervisor (throughput & team)
 * - 'hse': Health, Safety & Environment specialist (compliance & zero accident)
 * - 'ga': General Affairs & Facility officer (infrastructure, asset & APD stock)
 * - 'hr': Human Resources & Training specialist (competency & disciplinary)
 * - 'admin': System Administrator (full IT & platform controls)
 */

import { SystemRole } from '../types/assessment';

export type ModuleAction =
  | 'view_dashboard'
  | 'submit_checklist'
  | 'take_quiz'
  | 'report_incident'
  | 'validate_incident'
  | 'safety_patrol'
  | 'upload_sio'
  | 'verify_sio'
  | 'request_ppe'
  | 'manage_ppe_stock'
  | 'perform_5s_audit'
  | 'submit_kaizen'
  | 'review_kaizen'
  | 'issue_disciplinary'
  | 'redeem_reward'
  | 'fulfill_reward'
  | 'generate_executive_report'
  | 'system_configuration';

export class PermissionService {
  /**
   * Returns list of system views that a user with the given role is allowed to open.
   */
  public static getAvailableViewsForRole(userRole: SystemRole): SystemRole[] {
    switch (userRole) {
      case 'admin':
        // System Admin has full oversight and can switch to any console
        return ['worker', 'supervisor', 'hse', 'ga', 'hr', 'admin'];

      case 'hse':
        // HSE Specialist can switch between operational shopfloor and HSE Console
        return ['worker', 'hse'];

      case 'ga':
        // GA Officer can switch between operational shopfloor and GA Console
        return ['worker', 'ga'];

      case 'hr':
        // HR Specialist can switch between operational shopfloor and HR Console
        return ['worker', 'hr'];

      case 'supervisor':
        // Supervisor can switch between operational shopfloor and Supervisor Console
        return ['worker', 'supervisor'];

      case 'worker':
      default:
        return ['worker'];
    }
  }

  /**
   * Checks whether a role has permission to access a specific target view.
   */
  public static canAccessView(userRole: SystemRole, targetView: SystemRole): boolean {
    return this.getAvailableViewsForRole(userRole).includes(targetView);
  }

  /**
   * Checks whether a role can validate K3 incidents and sign off on CAPA.
   */
  public static canValidateIncidents(role: SystemRole): boolean {
    return role === 'hse' || role === 'admin' || role === 'supervisor';
  }

  /**
   * Checks whether a role can inspect, approve, or renew MHE SIO licenses.
   */
  public static canManageSioLicenses(role: SystemRole): boolean {
    return role === 'hse' || role === 'admin';
  }

  /**
   * Checks whether a role can manage master PPE stock, reorder levels, and inventory.
   */
  public static canManagePpeInventory(role: SystemRole): boolean {
    return role === 'ga' || role === 'admin';
  }

  /**
   * Checks whether a role can perform official 5R / 5S warehouse & facility audits.
   */
  public static canPerform5sAudit(role: SystemRole): boolean {
    return role === 'ga' || role === 'hse' || role === 'supervisor' || role === 'admin';
  }

  /**
   * Checks whether a role can issue official disciplinary sanctions (SP1, SP2, SP3).
   */
  public static canManageDisciplinary(role: SystemRole): boolean {
    return role === 'hr' || role === 'admin' || role === 'supervisor';
  }

  /**
   * Checks whether a role can mark physical reward vouchers/merchandise as fulfilled.
   */
  public static canFulfillRewards(role: SystemRole): boolean {
    return role === 'ga' || role === 'admin';
  }

  /**
   * Checks whether a role is authorized to sign and generate a specific executive report type.
   */
  public static canSignExecutiveReport(reportType: string, role: SystemRole): boolean {
    if (role === 'admin') return true;

    switch (reportType) {
      case 'competency_matrix':
        return role === 'hr' || role === 'supervisor';
      case 'k3_incident':
      case 'mhe_sio':
        return role === 'hse';
      case 'ppe_inventory':
        return role === 'ga' || role === 'hse';
      case 'reward_budget':
        return role === 'ga' || role === 'hr';
      default:
        return false;
    }
  }
}
