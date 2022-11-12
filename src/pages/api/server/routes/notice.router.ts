import { Notice } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { REACT_APP_AWS_BUCKET_ID } from "../../../../constants";
import {
  changeNoticeStatusInput,
  ChangeNoticeStatusOutput,
  changeNoticeStatusOutput,
  createNoticeInput,
  CreateNoticeOutput,
  createNoticeOutput,
  deleteNoticeInput,
  DeleteNoticeOutput,
  deleteNoticeOutput,
  getNoticeDetailInput,
  GetNoticeDetailOutput,
  getNoticeDetailOutput,
  getNoticeListInput,
  GetNoticeListOutput,
  getNoticeListOutput,
  NoticeMetadata,
  noticeSearchInput,
  userNoticeInput,
  UserNoticeOutput,
  userNoticeOutput
} from "../../../../schema/notice.schema";
import { createRouter } from "../createRouter";
import { prismaError } from "../errors/prisma.errors";
import { S3Instance } from "../s3_instance";

export const noticeRouter = createRouter()
  .mutation("create-notice", {
    input: createNoticeInput,
    output: createNoticeOutput,
    async resolve({ ctx, input }) {
      const { adminEmail, attachments, body, isPublished, tags, title } = input;
      let response: CreateNoticeOutput = {
        adminEmail: "",
        isPublished: false,
        title: "",
      };
      try {
        const dbUser = await ctx?.prisma.user.findFirst({
          where: {
            email: adminEmail,
          },
        });

        if (dbUser?.role == "ADMIN" || dbUser?.role == "SUPER_ADMIN") {
          const dbRespNotice: Notice = await ctx?.prisma?.notice?.create({
            data: {
              body: body,
              title: title,
              isPublished: isPublished,
              tags: tags,
              attachments: {
                create: attachments.map((atth) => ({
                  fileid: atth.fileid,
                  filename: atth.filename,
                  filetype: atth.filetype,
                })),
              },
              admin: {
                connect: {
                  email: adminEmail,
                },
              },
            },
            include: {
              admin: true,
              attachments: true,
            },
          })!;

          response = {
            adminEmail: dbRespNotice.adminEmailFk,
            isPublished: dbRespNotice.isPublished,
            title: dbRespNotice.title,
          };
        }
      } catch (e) {
        console.log(e);
        if (e instanceof PrismaClientKnownRequestError) {
          prismaError(e);
        }
      }

      // default response
      return response
    },
  })
  .query("notice-detail", {
    input: getNoticeDetailInput,
    output: getNoticeDetailOutput,
    async resolve({ ctx, input }): Promise<GetNoticeDetailOutput> {
      const { id } = input;
      let atthUrls: { url: string; name: string; type: string }[] = new Array<{
        url: string;
        name: string;
        type: string;
      }>(0);

      let response = {
        id: "",
        tags: new Array<string>(0),
        isPublished: true,
        title: "",
        body: "",
        attachments: atthUrls,
      };
      try {
        const dbRespNotice = await ctx?.prisma.notice.findUnique({
          where: {
            id: id,
          },
          include: {
            admin: {
              select: {
                email: true,
                name: true,
              },
            },
            attachments: {
              select: {
                id: true,
                fileid: true,
                filename: true,
                filetype: true,
              },
            },
          },
        });
        if (dbRespNotice?.attachments && dbRespNotice.attachments.length > 0) {
          for (let file of dbRespNotice.attachments) {
            const url = await S3Instance.GetS3().getSignedUrlPromise(
              "getObject",
              {
                Bucket: REACT_APP_AWS_BUCKET_ID,
                Key: `${file.fileid}`,
              }
            );

            atthUrls.push({
              url: url,
              name: file.filename,
              type: file.filetype,
            });
          }
        }

        if (dbRespNotice) {
          response = {
            id: dbRespNotice.id,
            title: dbRespNotice.title,
            tags: dbRespNotice.tags,
            body: dbRespNotice.body,
            isPublished: dbRespNotice.isPublished,
            attachments: atthUrls,
          };
        }
      } catch (e) {
        if (e instanceof PrismaClientKnownRequestError) {
          throw prismaError(e);
        }
        console.log(e);
      }

      // default response
      return response;
    },
  })
  .query("published-notice-list", {
    input: getNoticeListInput,
    output: getNoticeListOutput,
    async resolve({ ctx, input }) {
      const { pageNos } = input;
      let response: GetNoticeListOutput = {
        notices: [],
        totalNotice: 0,
      };
      try {
        const noticeLenght: number = await ctx?.prisma.notice.count({
          where: {
            isPublished: true,
          },
        })!;
        const dbResp: Notice[] = await ctx?.prisma.notice.findMany({
          where: {
            isPublished: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: (pageNos - 1) * 10,
          take: 10,
        })!;

        const resp: NoticeMetadata[] = dbResp.map((data) => {
          return {
            id: data.id,
            title: data.title,
            admin: data.adminEmailFk,
            tags: data.tags,
            updatedAt: data.updatedAt,
          };
        });
        response = { totalNotice: noticeLenght, notices: resp };
      } catch (e) {
        console.log(e);
        if (e instanceof PrismaClientKnownRequestError) {
          throw prismaError(e);
        }
      }
      // default response
      return response;
    },
  })
  .query("my-notices", {
    input: userNoticeInput,
    output: userNoticeOutput,
    async resolve({ ctx, input }) {
      let response: UserNoticeOutput = {
        count: 0,
        notice: [],
      };
      try {
        const dbNoticeCount = await ctx?.prisma.notice.count({
          where: {
            adminEmailFk: input.email,
          },
        })!;
        const dbNotice = await ctx?.prisma.notice.findMany({
          where: {
            adminEmailFk: input.email,
          },
          select: {
            id: true,
            isPublished: true,
            title: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 10,
          skip: (input.pageNos - 1) * 10,
        });

        const respNotice: NoticeMetadata[] = dbNotice?.map(
          (notice): NoticeMetadata => ({
            id: notice.id,
            title: notice.title,
            updatedAt: notice.updatedAt,
            isPublished: notice.isPublished,
          })
        )!;

        response = {
          notice: respNotice,
          count: dbNoticeCount,
        };
      } catch (e) {
        if (e instanceof PrismaClientKnownRequestError) {
          prismaError(e);
        }
        console.log(e);
      }
      return response;
    },
  })
  .mutation("change-notice-status", {
    input: changeNoticeStatusInput,
    output: changeNoticeStatusOutput,
    async resolve({ ctx, input }) {
      let response: ChangeNoticeStatusOutput = {
        isPublished: false,
      };
      try {
        await ctx?.prisma.notice.update({
          data: {
            isPublished: input.isPublished,
          },
          where: {
            id: input.noticeId,
          },
        });
        response = { isPublished: input.isPublished };
      } catch (e) {
        if (e instanceof PrismaClientKnownRequestError) {
          prismaError(e);
        }
        console.log(e);
      }
      return response;
    },
  })
  .mutation("delete-notice", {
    input: deleteNoticeInput,
    output: deleteNoticeOutput,
    async resolve({ ctx, input }) {
      let response: DeleteNoticeOutput = { isDeleted: false };
      try {
        const noticeToDelete = await ctx?.prisma.notice.findFirst({
          where: {
            id: input.noticeId,
          },
          select: {
            _count: true,
            attachments: true,
          },
        });

        // delete all attachment
        await ctx?.prisma.notice.update({
          where: {
            id: input.noticeId,
          },
          data: {
            attachments: {
              deleteMany: {},
            },
          },
        });

        if (
          noticeToDelete?._count.attachments &&
          noticeToDelete?._count.attachments > 0
        ) {
          console.log("files found");
          for (let file of noticeToDelete?.attachments) {
            await S3Instance.GetS3().deleteObject(
              {
                Bucket: REACT_APP_AWS_BUCKET_ID!,
                Key: `${file.fileid}`,
              },
              (err, data) => {
                console.log(data, err);
              }
            );
          }
        }

        await ctx?.prisma.notice.delete({
          where: {
            id: input.noticeId,
          },
          select: {
            _count: true,
            attachments: true,
          },
        });

        response = { isDeleted: true };
      } catch (e) {
        if (e instanceof PrismaClientKnownRequestError) {
          prismaError(e);
        }
        console.log(e);
      }
      return response;
    },
  })
  .mutation("search-notice-by-title", {
    input: noticeSearchInput,
    output: getNoticeListOutput,
    async resolve({ ctx, input }) {
      let response: GetNoticeListOutput = {
        notices: [],
        totalNotice: 0,
      };
      try {
        const searchProcessedString = input.searchText
          .replace(/[^a-zA-Z0-9 ]/g, "") // remove special charachters
          .replace(/ +(?= )/g, "") // remove multiple whitespace
          .trim(); // remove starting and trailing spaces
        //.replaceAll(" ", " | "); // add or
        const dbNoticeSearch = await ctx?.prisma.notice.findMany({
          where: {
            title: {
              contains: searchProcessedString,
              mode: "insensitive",
            },
          },
        });

        const metaNoticeData: NoticeMetadata[] = dbNoticeSearch?.map(
          (notice) => {
            return {
              admin: notice.adminEmailFk,
              id: notice.id,
              tags: notice.tags,
              title: notice.title,
              updatedAt: notice.updatedAt,
            };
          }
        )!;
        response = {
          notices: metaNoticeData,
          totalNotice: dbNoticeSearch?.length || 0,
        };
        return response;
      } catch (e) {
        if (e instanceof PrismaClientKnownRequestError) {
          prismaError(e);
        }
        console.log(e);
      }
      return response;
    },
  });
