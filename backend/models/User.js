const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  
  // ✅ Local Email/Password
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true, // Allow null for Google users
    validate: {
      isEmail: true,
      len: [5, 255]
    },
  },
  
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true, // Allow null for Google users
    validate: {
      len: [60, 255]
    }
  },
  
  // ✅ Facebook Auth Fields
  facebookId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  
  // ✅ Google Auth Fields
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  
  displayName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  
  photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  
  provider: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'local' // Changed default to 'local' for email/password users
  },
  
  // ✅ Forgot Password OTP Fields
  resetOtp: {
    type: DataTypes.STRING(6),
    allowNull: true,
  },
  
  otpExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  
}, {
  tableName: 'Users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email'],
      where: {
        email: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    },
    {
      unique: true,
      fields: ['googleId'],
      where: {
        googleId: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    },
    {
      unique: true,
      fields: ['facebookId'],
      where: {
        facebookId: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    }
  ],
  hooks: {
    beforeCreate: (user) => {
      if (user.email) {
        user.email = user.email.toLowerCase();
      }
    },
    beforeUpdate: (user) => {
      if (user.email) {
        user.email = user.email.toLowerCase();
      }
    }
  }
});

module.exports = User;