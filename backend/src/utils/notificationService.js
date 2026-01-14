/**
 * Notification Service
 * Centralized service for creating and sending notifications
 */

const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Create a notification
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} Created notification
   */
  static async create(data) {
    try {
      const notification = await Notification.createNotification(data);
      return notification;
    } catch (error) {
      console.error('NotificationService.create error:', error);
      throw error;
    }
  }

  /**
   * Notify when an executive is added to a project by a designer
   * @param {Object} params
   * @param {string} params.executiveId - The executive being added
   * @param {string} params.designerId - The designer adding the executive
   * @param {string} params.projectId - The project
   * @param {string} params.projectTitle - Project title
   */
  static async notifyExecutiveAddedToProject({ executiveId, designerId, projectId, projectTitle }) {
    return this.create({
      recipient: executiveId,
      sender: designerId,
      type: 'executive_added',
      title: 'Added to Project',
      message: `You have been added to the project "${projectTitle}" by the designer.`,
      relatedProject: projectId,
      priority: 'high',
    });
  }

  /**
   * Notify when a vendor team member is added by an executive
   * @param {Object} params
   * @param {string} params.vendorId - The vendor team member being added
   * @param {string} params.executiveId - The executive adding the vendor
   * @param {string} params.projectId - The project
   * @param {string} params.projectTitle - Project title
   * @param {string} params.materialRequestTitle - Material request title (optional)
   */
  static async notifyVendorAssignedToProject({
    vendorId,
    executiveId,
    projectId,
    projectTitle,
    materialRequestTitle,
    materialRequestId,
  }) {
    return this.create({
      recipient: vendorId,
      sender: executiveId,
      type: 'vendor_assigned',
      title: 'Assigned to Project',
      message: materialRequestTitle
        ? `You have been assigned to "${projectTitle}" for material request: ${materialRequestTitle}.`
        : `You have been assigned to the project "${projectTitle}".`,
      relatedProject: projectId,
      relatedMaterialRequest: materialRequestId,
      priority: 'high',
    });
  }

  /**
   * Send project schedule reminder to a designer
   * @param {Object} params
   * @param {string} params.designerId - The designer to notify
   * @param {string} params.projectId - The project
   * @param {string} params.projectTitle - Project title
   * @param {string} params.reminderType - Type of reminder (deadline, milestone, etc.)
   * @param {string} params.reminderMessage - Custom reminder message
   * @param {Date} params.dueDate - The due date being reminded about
   */
  static async sendScheduleReminder({
    designerId,
    projectId,
    projectTitle,
    reminderType,
    reminderMessage,
    dueDate,
  }) {
    const formattedDate = dueDate
      ? new Date(dueDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

    return this.create({
      recipient: designerId,
      type: 'schedule_reminder',
      title: reminderType === 'deadline' ? '⏰ Deadline Reminder' : '📅 Schedule Reminder',
      message: reminderMessage || `Reminder: "${projectTitle}" has an upcoming ${reminderType} on ${formattedDate}.`,
      relatedProject: projectId,
      priority: reminderType === 'deadline' ? 'high' : 'normal',
      metadata: { reminderType, dueDate },
    });
  }

  /**
   * Notify about task assignment
   * @param {Object} params
   */
  static async notifyTaskAssigned({ assigneeId, assignerId, projectId, taskId, taskTitle, projectTitle }) {
    return this.create({
      recipient: assigneeId,
      sender: assignerId,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${taskTitle}" in project "${projectTitle}".`,
      relatedProject: projectId,
      relatedTask: taskId,
      priority: 'normal',
    });
  }

  /**
   * Notify about new material request
   * @param {Object} params
   */
  static async notifyMaterialRequest({ recipientId, senderId, projectId, materialRequestId, requestTitle }) {
    return this.create({
      recipient: recipientId,
      sender: senderId,
      type: 'material_request',
      title: 'New Material Request',
      message: `A new material request "${requestTitle}" needs your attention.`,
      relatedProject: projectId,
      relatedMaterialRequest: materialRequestId,
      priority: 'normal',
    });
  }

  /**
   * Notify about quotation received
   * @param {Object} params
   */
  static async notifyQuotationReceived({ recipientId, vendorId, projectId, purchaseOrderId, amount }) {
    return this.create({
      recipient: recipientId,
      sender: vendorId,
      type: 'quotation_received',
      title: 'New Quotation Received',
      message: `A vendor has submitted a quotation of ₹${amount.toLocaleString()}.`,
      relatedProject: projectId,
      relatedPurchaseOrder: purchaseOrderId,
      priority: 'normal',
    });
  }

  /**
   * Notify about quotation accepted
   * @param {Object} params
   */
  static async notifyQuotationAccepted({ vendorId, executiveId, projectId, purchaseOrderId, amount }) {
    return this.create({
      recipient: vendorId,
      sender: executiveId,
      type: 'quotation_accepted',
      title: '✅ Quotation Accepted!',
      message: `Your quotation of ₹${amount.toLocaleString()} has been accepted.`,
      relatedProject: projectId,
      relatedPurchaseOrder: purchaseOrderId,
      priority: 'high',
    });
  }

  /**
   * Notify about project update
   * @param {Object} params
   */
  static async notifyProjectUpdate({ recipientId, senderId, projectId, projectTitle, updateMessage }) {
    return this.create({
      recipient: recipientId,
      sender: senderId,
      type: 'project_update',
      title: 'Project Update',
      message: updateMessage || `There's an update on project "${projectTitle}".`,
      relatedProject: projectId,
      priority: 'normal',
    });
  }

  /**
   * Notify about milestone completion
   * @param {Object} params
   */
  static async notifyMilestoneCompleted({ recipientIds, senderId, projectId, projectTitle, milestoneName }) {
    const notifications = recipientIds.map((recipientId) =>
      this.create({
        recipient: recipientId,
        sender: senderId,
        type: 'milestone_completed',
        title: '🎉 Milestone Completed!',
        message: `Milestone "${milestoneName}" has been completed in "${projectTitle}".`,
        relatedProject: projectId,
        priority: 'normal',
      })
    );
    return Promise.all(notifications);
  }

  /**
   * Get unread count for a user
   * @param {string} userId
   * @returns {Promise<number>}
   */
  static async getUnreadCount(userId) {
    return Notification.getUnreadCount(userId);
  }
}

module.exports = NotificationService;
