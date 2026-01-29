router.get("/", authenticate, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(notifications);
});

router.patch("/:id/read", authenticate, async (req, res) => {
  await prisma.notification.update({
    where: { id: req.params.id },
    data: { read: true },
  });
  res.json({ message: "Marked as read" });
});
module.exports = router;