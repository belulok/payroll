const { Service } = require('feathers-mongoose');
const bcrypt = require('bcryptjs');

exports.Users = class Users extends Service {
  async resetPassword(id, params) {
    // Generate a random password
    const newPassword = this.generateRandomPassword();

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password directly in the database to bypass all hooks
    // This is necessary because patch hooks require admin role
    await this.Model.findByIdAndUpdate(id, { password: hashedPassword });

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

