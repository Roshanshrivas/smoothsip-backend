import Address from '../../models/Address.js';
import logger from '../../utils/logger.js';

// ─── Get all addresses ──────────────────────────────
export const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.userId })
      .sort({ isDefault: -1, createdAt: -1 });
    res.json(addresses);
  } catch (error) {
    logger.error('Get addresses error:', error);
    res.status(500).json({ message: 'Failed to fetch addresses' });
  }
};

// ─── Add a new address ──────────────────────────────
export const addAddress = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      label,
      fullName,
      phoneNumber,
      address,
      city,
      state,
      pinCode,
      country,
      isDefault,
    } = req.body;

    // Validate required fields
    if (!fullName || !phoneNumber || !address || !city || !state || !pinCode) {
      return res.status(400).json({
        message: 'All required fields (fullName, phoneNumber, address, city, state, pinCode) must be filled',
      });
    }

    // If this is the first address, make it default
    const count = await Address.countDocuments({ user: req.userId });
    const defaultFlag = isDefault !== undefined ? isDefault : count === 0;

    const newAddress = await Address.create({
      user: req.userId,
      label: label || 'Home',
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pinCode: pinCode.trim(),
      country: country || 'India',
      isDefault: defaultFlag,
    });

    logger.info(`Address added for user ${req.userId}`);
    res.status(201).json(newAddress);
  } catch (error) {
    logger.error('Add address error:', error);
    // Send detailed error for debugging
    res.status(500).json({
      message: 'Failed to add address',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// ─── Update address ──────────────────────────────────
export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const address = await Address.findOne({ _id: id, user: req.userId });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    Object.assign(address, updates);
    await address.save();

    logger.info(`Address updated: ${id} for user ${req.userId}`);
    res.json(address);
  } catch (error) {
    logger.error('Update address error:', error);
    res.status(500).json({ message: 'Failed to update address' });
  }
};

// ─── Delete address ──────────────────────────────────
export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOneAndDelete({ _id: id, user: req.userId });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If deleted address was default, set another as default
    if (address.isDefault) {
      const nextDefault = await Address.findOne({ user: req.userId });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    logger.info(`Address deleted: ${id} for user ${req.userId}`);
    res.json({ message: 'Address deleted' });
  } catch (error) {
    logger.error('Delete address error:', error);
    res.status(500).json({ message: 'Failed to delete address' });
  }
};

// ─── Set default address ─────────────────────────────
export const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({ _id: id, user: req.userId });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Set all others to non-default
    await Address.updateMany(
      { user: req.userId, _id: { $ne: id } },
      { $set: { isDefault: false } }
    );
    address.isDefault = true;
    await address.save();

    logger.info(`Default address set: ${id} for user ${req.userId}`);
    res.json(address);
  } catch (error) {
    logger.error('Set default address error:', error);
    res.status(500).json({ message: 'Failed to set default address' });
  }
};