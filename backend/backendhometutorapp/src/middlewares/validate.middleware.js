const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((d) => ({
          message: d.message,
          path: d.path.join("."),
        })),
      });
    }

    req[source] = value;
    next();
  };

module.exports = { validate };
