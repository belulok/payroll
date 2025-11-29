const { Service } = require('feathers-mongoose');

exports.Users = class Users extends Service {
  async resetPassword(id, params) {
    // Generate a random password
    const newPassword = this.generateRandomPassword();

    // Hash the password using the app's authentication service
    const hashedPassword = await this.app.service('authentication').hashPassword(newPassword);

    // Update the user's password
    await this.patch(id, { password: hashedPassword }, params);

    // Return the plain text password (only time it's visible)
    return { password: newPassword };
  }

  generateRandomPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
};

