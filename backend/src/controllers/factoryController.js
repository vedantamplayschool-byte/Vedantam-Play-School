import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { buildQuery, paginate } from '../utils/apiFeatures.js';
import { uploadImage } from '../services/uploadService.js';

export const list = (Model, searchFields = [], baseFilter = {}) =>
  asyncHandler(async (req, res) => {
    const filter = {
      ...baseFilter,
      ...buildQuery(req.query, searchFields)
    };

    const { items, pagination } = await paginate(
      Model,
      filter,
      req.query
    );

    ok(res, {
      data: items,
      pagination
    });
  });

export const getOne = (Model, baseFilter = {}) =>
  asyncHandler(async (req, res) => {
    const doc = await Model.findOne({
      _id: req.params.id,
      ...baseFilter
    });

    if (!doc) {
      const e = new Error('Resource not found');
      e.status = 404;
      throw e;
    }

    ok(res, { data: doc });
  });

export const create = Model =>
  asyncHandler(async (req, res) => {
    const payload = { ...req.body };

    if (req.file) {
      const uploaded = await uploadImage(
        req.file,
        `vedantam/${Model.modelName.toLowerCase()}`,
        req
      );

      payload.imageUrl = uploaded.url;
      payload.photoUrl = uploaded.url;
      payload.publicId = uploaded.publicId;
    }

    const doc = await Model.create(payload);

    ok(res, {
      status: 201,
      message: 'Created successfully',
      data: doc
    });
  });

export const update = Model =>
  asyncHandler(async (req, res) => {
    const payload = { ...req.body };

    if (req.file) {
      const uploaded = await uploadImage(
        req.file,
        `vedantam/${Model.modelName.toLowerCase()}`,
        req
      );

      payload.imageUrl = uploaded.url;
      payload.photoUrl = uploaded.url;
      payload.publicId = uploaded.publicId;
    }

    const doc = await Model.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true
      }
    );

    if (!doc) {
      const e = new Error('Resource not found');
      e.status = 404;
      throw e;
    }

    ok(res, {
      message: 'Updated successfully',
      data: doc
    });
  });

export const remove = Model =>
  asyncHandler(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      const e = new Error('Resource not found');
      e.status = 404;
      throw e;
    }

    ok(res, {
      message: 'Deleted successfully',
      data: doc
    });
  });
